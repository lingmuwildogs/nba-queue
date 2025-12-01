import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  tts?: boolean;
  allowed_mentions?: {
    parse?: string[];
    users?: string[];
    roles?: string[];
    replied_user?: boolean;
  };
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  thumbnail?: {
    url: string;
    height?: number;
    width?: number;
  };
  image?: {
    url: string;
    height?: number;
    width?: number;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DiscordService {
  private webhookUrl = 'https://discord.com/api/webhooks/1445002529921564784/lgWzRmTdIfaVcIFD91wdnh9Ri5Vz0RYh8Sn7sUbRxqMPu96ADNb0zIXgV-8b3FrCB5dc';

  constructor(private http: HttpClient) {}

  /**
   * Send a simple text message to Discord
   * @param message The text message to send
   */
  sendMessage(message: string): Observable<any> {
    const payload: DiscordMessage = { content: message };
    return this.send(payload);
  }

  /**
   * Send a rich embed message to Discord
   * @param embed The embed object
   */
  sendEmbed(embed: DiscordEmbed): Observable<any> {
    const payload: DiscordMessage = { embeds: [embed] };
    return this.send(payload);
  }

  /**
   * Send a custom Discord message
   * @param payload The full Discord message payload
   */
  send(payload: DiscordMessage): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(this.webhookUrl, payload, { headers });
  }

  /**
   * Set a custom webhook URL
   * @param url The new webhook URL
   */
  setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }
}
