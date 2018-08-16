import express from 'express';
import { Application, Router, Request, Response } from 'express';
import { json, urlencoded } from 'body-parser';
import cors from 'cors';
import { eventContext } from 'aws-serverless-express/middleware';

const router: Router = Router();

router.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

export function configureApp() {
  const app: Application = express();
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(eventContext());

  app.use('/', router);

  return app;
}
