import express, { Request, Response } from 'express';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);


app.get('/', (_req: Request, res: Response) => {
  res.send('Server is running.');
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
