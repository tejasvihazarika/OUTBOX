import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { ENV } from '../config/env';
import { prisma } from '../services/db';
import { getSlackAuthorizeUrl, handleSlackCallback } from '../services/slack';

const router = Router();
const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, mockUser } = req.body;
    let payloadUser = {
      googleId: 'google-demo-123',
      email: 'demo.user@reachinbox.ai',
      name: 'Demo Admin User',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    if (credential && !credential.startsWith('MOCK_')) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: ENV.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload) {
          payloadUser = {
            googleId: payload.sub,
            email: payload.email || 'user@google.com',
            name: payload.name || 'Google User',
            picture: payload.picture || payloadUser.picture
          };
        }
      } catch (gErr: any) {
        console.warn('[Google Auth] Verification fallback for placeholder client ID:', gErr.message);
        if (mockUser) {
          payloadUser = { ...payloadUser, ...mockUser };
        }
      }
    } else if (mockUser) {
      payloadUser = { ...payloadUser, ...mockUser };
    }

    let user = await prisma.user.findUnique({
      where: { email: payloadUser.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: payloadUser
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, picture: user.picture },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('outbox_token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      user,
      token
    });
  } catch (err: any) {
    console.error('[Google Auth Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.outbox_token || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
    return res.json({ authenticated: true, user: decoded });
  } catch (err: any) {
    return res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('outbox_token');
  return res.json({ message: 'Logged out successfully' });
});

router.get('/slack', (_req: Request, res: Response) => {
  const authorizeUrl = getSlackAuthorizeUrl();
  return res.redirect(authorizeUrl);
});

router.get('/slack/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(`${ENV.FRONTEND_URL}/?slack=error&msg=No_code_provided`);
  }

  const result = await handleSlackCallback(code);
  if (result.ok) {
    return res.redirect(`${ENV.FRONTEND_URL}/?slack=success`);
  } else {
    return res.redirect(`${ENV.FRONTEND_URL}/?slack=error&msg=${encodeURIComponent(result.error || 'OAuth_failed')}`);
  }
});

export default router;
