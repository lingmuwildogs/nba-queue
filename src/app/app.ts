import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Player {
  name: string;
  position: string;
}

interface Team {
  name: string;
  players: Player[];
  captain: string | null;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('NBA 2K QUEUEING SYSTEM');
  
  positions = ['PG', 'SG', 'SF', 'PF', 'CENTER'];
  
  team1 = signal<Team>({
    name: 'BANANA TREE HOLE',
    players: [
      { name: '', position: 'PG' },
      { name: '', position: 'SG' },
      { name: '', position: 'SF' },
      { name: '', position: 'PF' },
      { name: '', position: 'CENTER' }
    ],
    captain: null
  });
  
  team2 = signal<Team>({
    name: 'PAGPAG EATER',
    players: [
      { name: '', position: 'PG' },
      { name: '', position: 'SG' },
      { name: '', position: 'SF' },
      { name: '', position: 'PF' },
      { name: '', position: 'CENTER' }
    ],
    captain: null
  });
  
  coinTossResult = signal<string>('');
  coinTossWinner = signal<string>('');
  showDraftMode = signal<boolean>(false);
  draftPool = signal<Player[]>([]);
  draftedTeam1 = signal<Player[]>([]);
  draftedTeam2 = signal<Player[]>([]);
  currentDrafter = signal<string>('');
  
  // Modal state
  showModal = signal<boolean>(false);
  modalTitle = signal<string>('');
  modalMessage = signal<string>('');
  modalType = signal<'alert' | 'confirm'>('alert');
  modalCallback = signal<(() => void) | null>(null);
  
  shuffleTeam(teamNumber: number) {
    // Get all players from both teams with their names and positions
    const allPlayers: Player[] = [];
    
    this.team1().players.forEach(p => {
      if (p.name.trim() !== '') {
        allPlayers.push({ ...p });
      }
    });
    
    this.team2().players.forEach(p => {
      if (p.name.trim() !== '') {
        allPlayers.push({ ...p });
      }
    });
    
    if (allPlayers.length === 0) {
      return;
    }
    
    // Group players by position
    const positionGroups: { [key: string]: string[] } = {};
    this.positions.forEach(pos => {
      positionGroups[pos] = [];
    });
    
    allPlayers.forEach(p => {
      positionGroups[p.position].push(p.name);
    });
    
    // Shuffle each position group
    Object.keys(positionGroups).forEach(pos => {
      if (positionGroups[pos].length > 0) {
        positionGroups[pos] = this.shuffleArray(positionGroups[pos]);
      }
    });
    
    // Redistribute players to both teams
    const newTeam1Players = this.team1().players.map(p => {
      if (positionGroups[p.position].length > 0) {
        return { name: positionGroups[p.position].shift()!, position: p.position };
      }
      return { name: '', position: p.position };
    });
    
    const newTeam2Players = this.team2().players.map(p => {
      if (positionGroups[p.position].length > 0) {
        return { name: positionGroups[p.position].shift()!, position: p.position };
      }
      return { name: '', position: p.position };
    });
    
    // Update both teams and clear captains
    this.team1.set({ 
      ...this.team1(), 
      players: newTeam1Players,
      captain: null 
    });
    
    this.team2.set({ 
      ...this.team2(), 
      players: newTeam2Players,
      captain: null 
    });
  }
  
  shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  setCaptain(teamNumber: number, playerIndex: number) {
    const team = teamNumber === 1 ? this.team1() : this.team2();
    const player = team.players[playerIndex];
    
    if (player.name.trim() === '') {
      this.showAlert('Invalid Selection', 'Please enter a player name first!');
      return;
    }
    
    const updatedTeam = { ...team, captain: player.name };
    
    if (teamNumber === 1) {
      this.team1.set(updatedTeam);
    } else {
      this.team2.set(updatedTeam);
    }
  }
  
  coinToss() {
    if (!this.team1().captain || !this.team2().captain) {
      this.showAlert('Missing Captains', 'Please select captains for both teams first!');
      return;
    }
    
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    this.coinTossResult.set(result);
    
    const winner = result === 'HEADS' ? this.team1().name : this.team2().name;
    this.coinTossWinner.set(winner);
    
    setTimeout(() => {
      this.showConfirm(
        'Coin Toss Result',
        `${winner} wins the toss! Start draft mode?`,
        () => this.startDraftMode(winner)
      );
    }, 500);
  }
  
  startDraftMode(winningTeam: string) {
    const allPlayers = [
      ...this.team1().players.filter(p => p.name.trim() !== ''),
      ...this.team2().players.filter(p => p.name.trim() !== '')
    ];
    
    // Find captains and their player objects
    const captain1 = allPlayers.find(p => p.name === this.team1().captain);
    const captain2 = allPlayers.find(p => p.name === this.team2().captain);
    
    // Remove captains from the pool
    const poolWithoutCaptains = allPlayers.filter(
      p => p.name !== this.team1().captain && p.name !== this.team2().captain
    );
    
    this.draftPool.set(this.shuffleArray(poolWithoutCaptains));
    
    // Automatically add captains to their respective teams
    this.draftedTeam1.set(captain1 ? [captain1] : []);
    this.draftedTeam2.set(captain2 ? [captain2] : []);
    
    this.currentDrafter.set(winningTeam);
    this.showDraftMode.set(true);
  }
  
  draftPlayer(player: Player) {
    // Check if current team already has a player in this position
    const currentTeam = this.currentDrafter() === this.team1().name 
      ? this.draftedTeam1() 
      : this.draftedTeam2();
    
    const hasPositionFilled = currentTeam.some(p => p.position === player.position);
    
    if (hasPositionFilled) {
      this.showAlert('Position Filled', `You already have a ${player.position} player!`);
      return;
    }
    
    const pool = this.draftPool();
    const newPool = pool.filter(p => p !== player);
    this.draftPool.set(newPool);
    
    if (this.currentDrafter() === this.team1().name) {
      this.draftedTeam1.set([...this.draftedTeam1(), player]);
      this.currentDrafter.set(this.team2().name);
    } else {
      this.draftedTeam2.set([...this.draftedTeam2(), player]);
      this.currentDrafter.set(this.team1().name);
    }
    
    if (newPool.length === 0) {
      this.showAlert('Draft Complete', 'All players have been drafted!');
    }
  }
  
  resetDraft() {
    this.showDraftMode.set(false);
    this.draftPool.set([]);
    this.draftedTeam1.set([]);
    this.draftedTeam2.set([]);
    this.coinTossResult.set('');
    this.coinTossWinner.set('');
  }
  
  showAlert(title: string, message: string) {
    this.modalTitle.set(title);
    this.modalMessage.set(message);
    this.modalType.set('alert');
    this.showModal.set(true);
  }
  
  showConfirm(title: string, message: string, callback: () => void) {
    this.modalTitle.set(title);
    this.modalMessage.set(message);
    this.modalType.set('confirm');
    this.modalCallback.set(callback);
    this.showModal.set(true);
  }
  
  closeModal() {
    this.showModal.set(false);
    this.modalCallback.set(null);
  }
  
  confirmModal() {
    const callback = this.modalCallback();
    if (callback) {
      callback();
    }
    this.closeModal();
  }
}
