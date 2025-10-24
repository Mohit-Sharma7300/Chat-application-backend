import * as jwt from 'jsonwebtoken';

export class JwtUtil {
  static isValidToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  static isValidAuthHeader(authorization: string) {
    const token: string = authorization.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}
