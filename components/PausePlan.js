import React, { useEffect, useState } from 'react';

export default function PausePlan(data) {

  const [pauseStatus, setPausestatus] = useState('Thinking of taking a break? You can pause your subscription here')
  const [pauseButtonStatus, setPauseButtonstatus] = useState('Pause')

  // const pauseSubscription = async (subscription_id) => {
  //   console.log(subscription_id)
  //   const response = await fetch("http://localhost:3000/api/pauseSubscription", { method: "POST", body: subscription_id });
  //   const data = await response.json();
  //   console.log(data)
  //   setPausestatus('Pause effective from ' + data.subData.scheduled_change.effective_at.substring(0, 10) + ' ' + data.subData.scheduled_change.effective_at.substring(11, 16))
  //   setPauseButtonstatus('Cancel Scheduled Pause')
  // }

  // const unpauseSubscription = async (subscription_id) => {
  //   console.log(subscription_id)
  //   const response = await fetch("http://localhost:3000/api/unpauseSubscription", { method: "POST", body: subscription_id });
  //   const data = await response.json();
  //   console.log(data)
  // }

  //status check
  // useEffect(() => {
  //   //grab sub_id from storage
  //   let subscription_id = sessionStorage.getItem("subscription_id");

  //   const getPauseStatus = async (subscription_id) => {
  //     const response = await fetch("http://localhost:3000/api/getSubscription", { method: "POST", body: subscription_id });
  //     const data = await response.json();
  //     console.log(data)
  //     if (data.subData.scheduled_change.action === 'pause') {
  //       setPausestatus('Pause effective from ' + data.subData.scheduled_change.effective_at.substring(0, 10) + ' ' + data.subData.scheduled_change.effective_at.substring(11, 16))
  //       setPauseButtonstatus('Cancel Scheduled Pause')
  //     } else {
  //       return
  //     }
  //   }
  //   getPauseStatus(subscription_id);
  // }, []);

    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Pause Plan</h3>
          <div className="mt-2 sm:flex sm:items-start sm:justify-between">
            <div className="max-w-xl text-sm text-gray-500">
              <p>
                {pauseStatus}
              </p>
            </div>
            <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:flex-shrink-0 sm:items-center">
              <button
                type="button"
                onClick={() => {
                  pauseSubscription(subscription_id)
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
              >
                {pauseButtonStatus}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  