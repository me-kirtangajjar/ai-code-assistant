export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface BasicProfile {
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginResult {
  accessToken: string;
  user: PublicUser;
}
