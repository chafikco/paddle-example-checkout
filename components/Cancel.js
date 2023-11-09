export default function Cancel() {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Danger Zone</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Once you cancel your subscription, you can recover it if requested within the scheduled change period.</p>
          </div>
          <div className="mt-5">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:text-sm"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>
    )
  }
  