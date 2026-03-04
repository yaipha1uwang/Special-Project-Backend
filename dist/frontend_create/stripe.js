import lodash from 'lodash';
const { partial } = lodash;
import regularStripe from 'npm:stripe';
const env = process.env;
class StripeError extends Error {
    type;
    param;
    constructor(message, type, param) {
        super(message);
        this.type = type;
        this.param = param;
    }
}
async function makeStripeRequest({ path, projectGroupId, token, params, }) {
    const result = await fetch(`${env.NEXT_PUBLIC_CREATE_API_BASE_URL}/v0/protected/stripe/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            token,
            projectGroupId,
            params,
            environment: 'DEVELOPMENT',
        }),
    });
    const data = await result.json();
    if (!result.ok) {
        if (data.error) {
            const { message, type, param } = data.error;
            throw new StripeError(message, type, param);
        }
        throw new Error('An error occurred');
    }
    return data;
}
async function createCheckoutSession(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'checkout',
        token,
        projectGroupId,
        params,
    });
    return { url: data.url };
}
async function listCheckoutSessions(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'checkout/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getCheckoutSession(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'checkout/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updateCheckoutSession(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'checkout/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function expireCheckoutSession(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'checkout/expire',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function listCheckoutSessionLineItems(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'checkout/line-items',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function createProduct(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'products',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listProducts(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'products/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getProduct(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'products/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updateProduct(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'products/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function deleteProduct(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'products/delete',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function createPrice(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'prices',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listPrices(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'prices/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getPrice(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'prices/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updatePrice(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'prices/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function createCustomer(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'customers',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listCustomers(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'customers/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getCustomer(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'customers/get',
        token,
        projectGroupId,
        params: {
            id,
            params,
        },
    });
    return data;
}
async function createPaymentIntent(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'payment-intents',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listPaymentIntents(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'payment-intents/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getPaymentIntent(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'payment-intents/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updatePaymentIntent(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'payment-intents/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function confirmPaymentIntent(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'payment-intents/confirm',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function cancelPaymentIntent(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'payment-intents/cancel',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function createSubscription(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'subscriptions',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listSubscriptions(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'subscriptions/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getSubscription(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'subscriptions/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updateSubscription(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'subscriptions/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function cancelSubscription(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'subscriptions/cancel',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function createInvoice(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'invoices',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listInvoices(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'invoices/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getInvoice(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'invoices/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updateInvoice(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'invoices/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function finalizeInvoice(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'invoices/finalize',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function payInvoice(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'invoices/pay',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function voidInvoice(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'invoices/void',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function createPaymentMethod(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'payment-methods',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listPaymentMethods(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'payment-methods/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getPaymentMethod(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'payment-methods/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function attachPaymentMethod(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'payment-methods/attach',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function detachPaymentMethod(projectGroupId, token, id, params = {}) {
    const data = await makeStripeRequest({
        path: 'payment-methods/detach',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function createCharge(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'charges',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listCharges(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'charges/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getCharge(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'charges/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function updateCharge(projectGroupId, token, id, params) {
    const data = await makeStripeRequest({
        path: 'charges/update',
        token,
        projectGroupId,
        params: { id, ...params },
    });
    return data;
}
async function createRefund(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'refunds',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function listRefunds(projectGroupId, token, params = {}) {
    const data = await makeStripeRequest({
        path: 'refunds/list',
        token,
        projectGroupId,
        params,
    });
    return data;
}
async function getRefund(projectGroupId, token, id) {
    const data = await makeStripeRequest({
        path: 'refunds/get',
        token,
        projectGroupId,
        params: { id },
    });
    return data;
}
async function createWebhookEndpoint(projectGroupId, token, params) {
    const data = await makeStripeRequest({
        path: 'webhooks',
        token,
        projectGroupId,
        params,
    });
    return data;
}
function getStripe({ projectGroupId, token }) {
    class StripeClient {
        checkout = {
            sessions: {
                create: (params) => createCheckoutSession(projectGroupId, token, params),
                list: partial(listCheckoutSessions, projectGroupId, token),
                retrieve: partial(getCheckoutSession, projectGroupId, token),
                update: partial(updateCheckoutSession, projectGroupId, token),
                expire: partial(expireCheckoutSession, projectGroupId, token),
                listLineItems: partial(listCheckoutSessionLineItems, projectGroupId, token),
            },
        };
        products = {
            create: partial(createProduct, projectGroupId, token),
            list: partial(listProducts, projectGroupId, token),
            retrieve: partial(getProduct, projectGroupId, token),
            update: partial(updateProduct, projectGroupId, token),
            del: partial(deleteProduct, projectGroupId, token),
        };
        prices = {
            create: partial(createPrice, projectGroupId, token),
            list: partial(listPrices, projectGroupId, token),
            retrieve: partial(getPrice, projectGroupId, token),
            update: partial(updatePrice, projectGroupId, token),
        };
        customers = {
            create: partial(createCustomer, projectGroupId, token),
            list: partial(listCustomers, projectGroupId, token),
            get: partial(getCustomer, projectGroupId, token),
            retrieve: partial(getCustomer, projectGroupId, token),
        };
        paymentIntents = {
            create: partial(createPaymentIntent, projectGroupId, token),
            list: partial(listPaymentIntents, projectGroupId, token),
            retrieve: partial(getPaymentIntent, projectGroupId, token),
            update: partial(updatePaymentIntent, projectGroupId, token),
            confirm: partial(confirmPaymentIntent, projectGroupId, token),
            cancel: partial(cancelPaymentIntent, projectGroupId, token),
        };
        paymentMethods = {
            create: partial(createPaymentMethod, projectGroupId, token),
            list: partial(listPaymentMethods, projectGroupId, token),
            retrieve: partial(getPaymentMethod, projectGroupId, token),
            attach: partial(attachPaymentMethod, projectGroupId, token),
            detach: partial(detachPaymentMethod, projectGroupId, token),
        };
        subscriptions = {
            create: partial(createSubscription, projectGroupId, token),
            list: partial(listSubscriptions, projectGroupId, token),
            retrieve: partial(getSubscription, projectGroupId, token),
            update: partial(updateSubscription, projectGroupId, token),
            cancel: partial(cancelSubscription, projectGroupId, token),
        };
        invoices = {
            create: partial(createInvoice, projectGroupId, token),
            list: partial(listInvoices, projectGroupId, token),
            retrieve: partial(getInvoice, projectGroupId, token),
            update: partial(updateInvoice, projectGroupId, token),
            finalizeInvoice: partial(finalizeInvoice, projectGroupId, token),
            pay: partial(payInvoice, projectGroupId, token),
            voidInvoice: partial(voidInvoice, projectGroupId, token),
        };
        charges = {
            create: partial(createCharge, projectGroupId, token),
            list: partial(listCharges, projectGroupId, token),
            retrieve: partial(getCharge, projectGroupId, token),
            update: partial(updateCharge, projectGroupId, token),
        };
        refunds = {
            create: partial(createRefund, projectGroupId, token),
            list: partial(listRefunds, projectGroupId, token),
            retrieve: partial(getRefund, projectGroupId, token),
        };
        webhookEndpoints = {
            create: partial(createWebhookEndpoint, projectGroupId, token),
        };
    }
    return StripeClient;
}
const hasEnv = env.CREATE_TEMP_API_KEY &&
    env.NEXT_PUBLIC_PROJECT_GROUP_ID &&
    env.NEXT_PUBLIC_CREATE_API_BASE_URL;
const stripe = hasEnv
    ? getStripe({
        projectGroupId: env.NEXT_PUBLIC_PROJECT_GROUP_ID,
        token: env.CREATE_TEMP_API_KEY,
    })
    : regularStripe;
export default stripe;
export { stripe as Stripe };
