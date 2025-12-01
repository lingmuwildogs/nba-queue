import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiscordService } from './services/discord.service';

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
  constructor(private discordService: DiscordService) {}

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
    
    let pool = this.draftPool();
    const newPool = pool.filter(p => p !== player);
    
    // Auto-pair: Find the other player with the same position and automatically add to opposing team
    let playerToDraft = player;
    let autoDraftedPlayer: Player | null = null;
    
    // Find the other player with the same position
    const otherPlayerSamePosition = newPool.find(p => p.position === player.position);
    
    if (otherPlayerSamePosition) {
      // Check if opposing team already has this position filled
      const opposingTeam = this.currentDrafter() === this.team1().name 
        ? this.draftedTeam2() 
        : this.draftedTeam1();
      
      const opposingTeamHasPosition = opposingTeam.some(p => p.position === player.position);
      
      if (!opposingTeamHasPosition) {
        autoDraftedPlayer = otherPlayerSamePosition;
        // Remove the auto-drafted player from the pool
        pool = newPool.filter(p => p !== otherPlayerSamePosition);
      } else {
        pool = newPool;
      }
    } else {
      pool = newPool;
    }
    
    this.draftPool.set(pool);
    
    if (this.currentDrafter() === this.team1().name) {
      this.draftedTeam1.set([...this.draftedTeam1(), playerToDraft]);
      
      // If we auto-drafted a player, add it to team 2
      if (autoDraftedPlayer) {
        this.draftedTeam2.set([...this.draftedTeam2(), autoDraftedPlayer]);
      }
      
      this.currentDrafter.set(this.team2().name);
    } else {
      this.draftedTeam2.set([...this.draftedTeam2(), playerToDraft]);
      
      // If we auto-drafted a player, add it to team 1
      if (autoDraftedPlayer) {
        this.draftedTeam1.set([...this.draftedTeam1(), autoDraftedPlayer]);
      }
      
      this.currentDrafter.set(this.team1().name);
    }
    
    if (pool.length === 0) {
      this.showAlert('Draft Complete', 'All players have been drafted!');
    } else if (autoDraftedPlayer) {
      this.showAlert('Position Auto-Draft', `${autoDraftedPlayer.name} (${autoDraftedPlayer.position}) automatically drafted to the opposing team!`);
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

  isTeamsAvailable(): boolean {
    const team1 = this.team1();
    const team2 = this.team2();
    const team1HasPlayers = team1.players.some(p => p.name.trim() !== '');
    const team2HasPlayers = team2.players.some(p => p.name.trim() !== '');
    return team1HasPlayers && team2HasPlayers;
  }

  sendToDiscord() {
    const team1 = this.team1();
    const team2 = this.team2();
    
    const embed = {
      title: '🏀 NBA 2K TEAM LINEUP',
      color: 16711680, // Red
      fields: [
        {
          name: `🔴 ${team1.name}`,
          value: this.formatTeamForDiscord(team1),
          inline: false
        },
        {
          name: `🔵 ${team2.name}`,
          value: this.formatTeamForDiscord(team2),
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    this.discordService.sendEmbed(embed).subscribe({
      next: () => {
        this.showAlert('Success!', '✅ Teams sent to Discord!');
      },
      error: (err) => {
        console.error('Discord error:', err);
        this.showAlert('Error', '❌ Failed to send to Discord. Check console.');
      }
    });
  }

  formatTeamForDiscord(team: Team): string {
    let text = '';
    if (team.captain) {
      text += `**👑 Captain:** ${team.captain}\n`;
    }
    text += '```\n';
    team.players.forEach(player => {
      if (player.name.trim()) {
        text += `${player.position.padEnd(8)} │ ${player.name}\n`;
      }
    });
    text += '```';
    return text;
  }

  sendToDiscordDraft() {
    const team1Name = this.team1().name;
    const team2Name = this.team2().name;
    
    const embed = {
      title: '🏀 NBA 2K DRAFTED TEAMS',
      color: 16711680, // Red
      fields: [
        {
          name: `🔴 ${team1Name}`,
          value: this.formatDraftedTeamForDiscord(this.draftedTeam1()),
          inline: false
        },
        {
          name: `🔵 ${team2Name}`,
          value: this.formatDraftedTeamForDiscord(this.draftedTeam2()),
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    this.discordService.sendEmbed(embed).subscribe({
      next: () => {
        this.showAlert('Success!', '✅ Drafted teams sent to Discord!');
      },
      error: (err) => {
        console.error('Discord error:', err);
        this.showAlert('Error', '❌ Failed to send to Discord. Check console.');
      }
    });
  }

  formatDraftedTeamForDiscord(players: Player[]): string {
    if (players.length === 0) {
      return '```\nNo players drafted yet\n```';
    }
    let text = '```\n';
    players.forEach(player => {
      text += `${player.position.padEnd(8)} │ ${player.name}\n`;
    });
    text += '```';
    return text;
  }
  
  exportTeamsToClipboard() {
    const team1 = this.team1();
    const team2 = this.team2();
    
    let text = `🏀 NBA 2K TEAMS\n`;
    text += `═══════════════════════════\n\n`;
    
    text += `🔴 ${team1.name}\n`;
    text += `${team1.captain ? `👑 Captain: ${team1.captain}\n` : ''}`;
    text += `─────────────────────────────\n`;
    team1.players.forEach(player => {
      if (player.name.trim()) {
        text += `${player.position.padEnd(8)} │ ${player.name}\n`;
      }
    });
    
    text += `\n🔵 ${team2.name}\n`;
    text += `${team2.captain ? `👑 Captain: ${team2.captain}\n` : ''}`;
    text += `─────────────────────────────\n`;
    team2.players.forEach(player => {
      if (player.name.trim()) {
        text += `${player.position.padEnd(8)} │ ${player.name}\n`;
      }
    });
    
    text += `\n═══════════════════════════`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      this.showAlert('Copied!', 'Team selection copied to clipboard! 🎉');
    }).catch(err => {
      this.showAlert('Error', 'Failed to copy to clipboard');
      console.error('Clipboard error:', err);
    });
  }
}
