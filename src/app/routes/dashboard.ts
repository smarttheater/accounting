/**
 * ダッシュボードルーター
 */
import * as express from 'express';

const dashboardRouter = express.Router();

dashboardRouter.get(
    '/',
    async (__, res, next) => {
        try {
            res.render('dashboard', {
                layout: 'layouts/dashboard',
                message: 'Welcome to Cinerino Console!',
                projects: [],
                extractScripts: true
            });
        } catch (error) {
            next(error);
        }
    });

export default dashboardRouter;
