// supabase/functions/get-invoice-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const { invoice_id, stripe_invoice_id, payment_intent_id } =
      await req.json();

    if (!stripe_invoice_id && !payment_intent_id) {
      return new Response(
        JSON.stringify({
          error: 'stripe_invoice_id or payment_intent_id is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let invoice: Stripe.Invoice | null = null;

    // Try to get invoice by stripe_invoice_id first
    if (stripe_invoice_id) {
      try {
        invoice = await stripe.invoices.retrieve(stripe_invoice_id);
      } catch (error: any) {
        console.warn(
          'Failed to retrieve invoice by stripe_invoice_id:',
          error.message
        );
      }
    }

    // If not found and payment_intent_id exists, search by payment intent
    if (!invoice && payment_intent_id) {
      try {
        const invoices = await stripe.invoices.list({
          payment_intent: payment_intent_id,
          limit: 1,
        });
        if (invoices.data.length > 0) {
          invoice = invoices.data[0];
        }
      } catch (error: any) {
        console.warn(
          'Failed to retrieve invoice by payment_intent_id:',
          error.message
        );
      }
    }

    if (!invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found in Stripe' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Ensure invoice is finalized (URLs are only available after finalization)
    if (invoice.status === 'draft') {
      try {
        invoice = await stripe.invoices.finalizeInvoice(invoice.id);
      } catch (error: any) {
        console.warn('Failed to finalize invoice:', error.message);
      }
    }

    // Get URLs
    const hosted_invoice_url = invoice.hosted_invoice_url;
    const invoice_pdf = invoice.invoice_pdf;
    const url = hosted_invoice_url || invoice_pdf || null;

    if (!url) {
      return new Response(
        JSON.stringify({
          error: 'Invoice URL not available',
          invoice_id: invoice.id,
          status: invoice.status,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        hosted_invoice_url,
        invoice_pdf,
        invoice_id: invoice.id,
        status: invoice.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error getting invoice URL:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
