import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type ActionResponse, type AdoptionInput, type PetAction, type PetResponse } from '@orio/contracts';

@Injectable({ providedIn: 'root' })
export class PetApiService {
  constructor(private readonly http: HttpClient) {}

  current() { return this.http.get<PetResponse>('/api/pets/current'); }
  adopt(input: AdoptionInput) { return this.http.post<PetResponse>('/api/pets', input); }
  action(action: PetAction, idempotencyKey: string) { return this.http.post<ActionResponse>(`/api/pets/current/actions/${action}`, { idempotencyKey }); }
}
