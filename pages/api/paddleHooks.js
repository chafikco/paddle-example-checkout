import { createClient } from "@supabase/supabase-js";

export default async function _(req, res) {

    const supabase = createClient(
        'https://bkivvixwzqwfdqucebcq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraXZ2aXh3enF3ZmRxdWNlYmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzY1ODQwOTEsImV4cCI6MTk5MjE2MDA5MX0.ia7V8BPOfgiCfCnQykA7f5ZfPwQmnrHE3jjLmq8FOMs'
    );

    // check if already exsits, if it does use UPDATE statement for Supabase

    // const { data: customers } = await supabase
    //     .from('customers')
    //     .select("*")

    // console.log(customers)

    let webhookData = req.body

    // create record block

    if (webhookData.event_type === 'transaction.created') {
        const { error } = await supabase
            .from('transactions')
            .insert({ id: webhookData.data.id,  })
    } else if (webhookData.event_type === 'subscription.created') {
        const { error } = await supabase
        .from('subscriptions')
        .insert({ id: webhookData.data.id })
    } else {
        console.log('no more to create')
    }

    // update record block

    // cancelled record block

    // paused record block
  
    return res.status(200).json({ webhookData })
  }
