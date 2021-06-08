/**
 * プロジェクトルーター
 */
import * as express from 'express';

import homeRouter from './home';

const projectsRouter = express.Router();

projectsRouter.all(
    '/:id/*',
    async (req, _, next) => {
        req.project = { id: req.params.id };

        next();
    }
);

projectsRouter.get(
    '/:id/logo',
    async (__, res) => {
        const logo = 'https://s3-ap-northeast-1.amazonaws.com/cinerino/logos/cinerino.png';

        res.redirect(logo);
    }
);

projectsRouter.use('/:id/home', homeRouter);

export default projectsRouter;
