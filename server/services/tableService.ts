/** V1 deliberately has no table, plan, or reservation domain. Route compatibility only. */
const excluded = (): never => { throw new Error('Fonctionnalité hors périmètre V1'); };
export class TableService {
  static getSpaces(..._a:any[]):any { return excluded(); } static createSpace(..._a:any[]):any { return excluded(); } static updateSpace(..._a:any[]):any { return excluded(); } static deleteSpace(..._a:any[]):any { return excluded(); } static reorderSpaces(..._a:any[]):any { return excluded(); }
  static getTables(..._a:any[]):any { return excluded(); } static createTable(..._a:any[]):any { return excluded(); } static duplicateTable(..._a:any[]):any { return excluded(); } static updateTable(..._a:any[]):any { return excluded(); } static deleteTable(..._a:any[]):any { return excluded(); } static updatePositions(..._a:any[]):any { return excluded(); }
  static getTableHistory(..._a:any[]):any { return excluded(); } static getPlanElements(..._a:any[]):any { return excluded(); } static createPlanElement(..._a:any[]):any { return excluded(); } static updatePlanElement(..._a:any[]):any { return excluded(); } static deletePlanElement(..._a:any[]):any { return excluded(); } static updatePlanElementPositions(..._a:any[]):any { return excluded(); }
  static getReservations(..._a:any[]):any { return excluded(); } static checkConflict(..._a:any[]):any { return excluded(); } static createReservation(..._a:any[]):any { return excluded(); } static updateReservation(..._a:any[]):any { return excluded(); } static deleteReservation(..._a:any[]):any { return excluded(); }
}
