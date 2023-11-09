import React, { useEffect, useState } from 'react';

export default function PlanStats(data) {
  const subscription_id = data.subscription_id
  console.log(subscription_id)

  const [stats, setStats] = useState(
    [
      { name: 'Current Item(s)', stat: 'Loading...' },
      { name: 'Next Bill Price', stat: 'Loading...' },
      { name: 'Next Bill Due', stat: 'Loading...' },
      { name: 'Quantity', stat: 'Loading...' },
    ]
  );

  useEffect(() => {

    const getApiData = async (subscription_id) => {
      const response = await fetch("http://localhost:3000/api/getSubscription", { method: "POST", body: subscription_id });
      const data = await response.json();
      console.log(data)
      setStats(
        [
          { name: 'Current Item(s)', stat: 'Growth' },
          { name: 'Subscription Status', stat: data.subData.status },
          { name: 'Next Bill Price', stat: data.subData.items[0].price.unit_price.amount},
          { name: 'Next Bill Due', stat: data.subData.next_billed_at.substring(0, 10)},
          { name: 'Quantity', stat: data.subData.items[0].quantity },
        ]
      )
    }

    if (subscription_id != 'sub_id') {
      getApiData(subscription_id)
    } else {
      console.log('not ready!')
    }
  }, [subscription_id]);

    return (
      <div>
        <h3 className="text-base font-semibold leading-6 text-gray-900">Overview</h3>
        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">{item.name}</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{item.stat}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }
  