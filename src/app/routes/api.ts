/**
 * アプリ内APIルーティング
 */
import * as express from 'express';
import * as PerformancesController from '../controllers/api/performances';
import * as ReservationsController from '../controllers/api/reservations';

import authentication from '../middlewares/authentication';

const apiRouter = express.Router();

apiRouter.get('/reservations', authentication, ReservationsController.search);
apiRouter.post('/reservations/cancel', authentication, ReservationsController.cancel);

// 運行・オンライン販売停止設定コントローラー
apiRouter.post('/performances/updateOnlineStatus', authentication, PerformancesController.updateOnlineStatus);

apiRouter.get('/events', authentication, PerformancesController.search);

export default apiRouter;
