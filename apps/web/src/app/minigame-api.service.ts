import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type MiniGameCompleteInput, type MiniGameResult, type MiniGameSession, type MiniGameStartInput } from '@orio/contracts';

@Injectable({ providedIn: 'root' })
export class MinigameApiService {
  constructor(private readonly http: HttpClient) {}

  start(input: MiniGameStartInput) { return this.http.post<MiniGameSession>('/api/minigames/sessions', input); }
  get(id: string) { return this.http.get<MiniGameSession>(`/api/minigames/sessions/${id}`); }
  complete(id: string, input: MiniGameCompleteInput) { return this.http.post<MiniGameResult>(`/api/minigames/sessions/${id}/complete`, input); }
  abandon(id: string) { return this.http.post<void>(`/api/minigames/sessions/${id}/abandon`, {}); }
}
