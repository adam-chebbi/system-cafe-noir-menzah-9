/** V1 deliberately has no POS, QR ordering, or KDS domain. Route compatibility only. */
const excluded = (): never => { throw new Error('Fonctionnalité hors périmètre V1'); };
export class OrderService {
  static getOrders(..._a:any[]):any { return excluded(); } static getOrderById(..._a:any[]):any { return excluded(); } static createQROrder(..._a:any[]):any { return excluded(); } static createPOSOrder(..._a:any[]):any { return excluded(); } static launchOrder(..._a:any[]):any { return excluded(); } static updateOrder(..._a:any[]):any { return excluded(); } static transferOrder(..._a:any[]):any { return excluded(); } static cancelOrder(..._a:any[]):any { return excluded(); } static acceptOrder(..._a:any[]):any { return excluded(); } static rejectOrder(..._a:any[]):any { return excluded(); } static updateItemStatus(..._a:any[]):any { return excluded(); } static processPayment(..._a:any[]):any { return excluded(); }
}
