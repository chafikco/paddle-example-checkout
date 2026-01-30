import { useEffect, useState, useRef } from "react";
import { useNumberInput, HStack, Button, Input } from "@chakra-ui/react";
import { initializePaddle } from '@paddle/paddle-js';

const options = [
  {
    id: 1,
    name: "Spaces",
    price_id: {
      monthly: "pri_01gtffwm3e2aw9hyqssvv0z5nw",
      annually: "pri_01gtfg0p2xz2b01s7pq9r7x709",
    },
  },
  {
    id: 2,
    name: "Integrations",
    price_id: {
      monthly: "pri_01gtffxr88e48wx7rsnnx5ca4m",
      annually: "pri_01gtfg1vvydfar5f8qpxa27n20",
    },
  },
  {
    id: 3,
    name: "SSO",
    price_id: {
      monthly: "pri_01gtffz0xmcxmb9pc6vbvsy3jj",
      annually: "pri_01gtffz0xmcxmb9pc6vbvsy3jj",
    },
  },
];

export default function Customise() {
  const [frequency, setFrequency] = useState("monthly");
  const [isMobileView, setIsMobileView] = useState(false);

  // -------- all below is quantity component
  const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } =
    useNumberInput({
      defaultValue: 1,
      min: 1,
      max: 100,
    });

  const inc = getIncrementButtonProps();
  const dec = getDecrementButtonProps();
  const input = getInputProps();

  // quantity controller
  const setQuantity = (quantity) => {
    let newQuantity = parseInt(quantity);
    let base_price_id = sessionStorage.getItem("price_id");

    setParams([
      {
        price_id: base_price_id,
        quantity: newQuantity,
      },
    ]);
    console.log(params);
  };

  // -------- all above is quantity component

  const [totals, setTotals] = useState(null);

  // state for checkout & pricing selection
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSlideIn, setDrawerSlideIn] = useState(false);

  // initial array configuration for plan
  const [params, setParams] = useState([
    {
      price_id: null,
      quantity: parseInt(1),
    },
  ]);

  // initial load price
  useEffect(() => {
    // wait until session storage is mounted from useEffect & grab trx_id
    let base_price_id = sessionStorage.getItem("price_id");

    //set initial frequency
    setFrequency(sessionStorage.getItem("interval"));

    // set params and trigger new useEffect
    setParams([
      {
        price_id: base_price_id,
        quantity: parseInt(1),
      },
    ]);
  }, []);


  const addItem = (items) => {
    // add item if not in array
    if (!params.some((e) => e.price_id === items.price_id)) {
      setParams([
        ...params,
        { price_id: items.price_id, quantity: items.quantity },
      ]);
    } else {
      setParams(params.filter((params) => params.price_id !== items.price_id));
    }

    console.log(params);
  };

  const [paddle, setPaddle] = useState();

  // confirm button load price
  useEffect(() => {
    if (params[0]?.price_id == null) return;

    // grab subsequent prices
    const getApiData = async () => {
      const response = await fetch("http://localhost:3000/api/pricePreview", {
        method: "POST",
        body: JSON.stringify(params),
      });
      const data = await response.json();
      const prices = data.data;

      setTotals(prices);
      console.log(prices);
    };
    getApiData();

    const testRequest = {
      items: [{
        quantity: 1,
        priceId: params[0].price_id,
      }],
    };

    paddle?.PricePreview(testRequest).then((result) => {
      console.log(result);
    });
  }, [params]);

  let transactionId = 'temp';

  useEffect(() => {
		initializePaddle({ environment: 'sandbox', token: 'test_37a3ae9038ae86dd31608afd2b9', eventCallback: (event) => {
      console.log(event)
      if (event.name === 'checkout.completed') {
        transactionId = event.data.transaction_id;
        console.log(transactionId)
        const openUpsellCheckout = () => {
          console.log('openUpsellCheckout')
          paddle?.Checkout.open({
            settings: {
              displayMode: "inline",
              theme: "light",
              locale: "en",
              variant: "express",
              frameTarget: "checkout-frame",
              frameStyle: "width: 100%",
              frameInitialHeight: "450",
            },
            customerAuthToken: "pca_01k9594nwh7d02rs5437bjdq5v_01k5h7ch3k5wjccfat72ywg09z_wo6slcsy32oftsxeiy7psmrtok7qr5zc",
            customer: {
              id: 'ctm_01k5h7ch3k5wjccfat72ywg09z'
            },
            upsell: {
              transactionId: `${transactionId}`,
              settings: {
                showSkipButton: true,              
              }
            },
            items: [
                {
                  priceId: 'pri_01kbzn386pbth1cqr35fz9f70k',
                  quantity: 1,
               },
            ],
          });
        };

        openUpsellCheckout();
      }
    } }).then(
      (paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      },
    ).catch((error) => {
      console.log(error);
    });
  }, []);

  // Animate mobile drawer slide-up when opening
  useEffect(() => {
    if (drawerOpen) {
      const frame = requestAnimationFrame(() => setDrawerSlideIn(true));
      return () => cancelAnimationFrame(frame);
    } else {
      setDrawerSlideIn(false);
    }
  }, [drawerOpen]);

		// Callback to open a checkout (inline for both mobile and desktop)
		const openCheckout = () => {
			paddle?.Checkout.open({
        settings: {
          displayMode: "inline",
          theme: "light",
          locale: "en",
          variant: "express",
          frameTarget: "checkout-frame",
          frameStyle: "width: 100%",
          frameInitialHeight: "450",
          // allowLogout: false,
          // showAddTaxId: false,
          // showAddDiscounts: false,
          // successUrl: `http://localhost:3000?transaction_id=${transactionId}`,
          // allowedPaymentMethods: ["google_pay", "apple_pay"]
        },
        items: [
            {
              priceId: 'pri_01kbzn386pbth1cqr35fz9f70k',
              quantity: 1,
           },
        ],
        discountId: 'dsc_01kbzn5h5b0pjhya23tzmqdjhb'
      });
		};

    const updateCheckout = () => {
      paddle?.Checkout.updateCheckout({
        items: [
          {
              priceId: 'pri_01j6hgyf3jad8frtpknhzaxks9',
              quantity: 15,
          },
          {
              priceId: 'pri_01j74en52nfd85zznt3nxf1ny2',
              quantity: 2,
          },
      ]
      })
    }

  // Shared plan summary content
  const planSummaryContent = (
    <>
      <h2 id="summary-heading" className="text-2xl font-medium text-white sm:text-3xl">
        Plan summary
      </h2>
      <dl className="mt-6 space-y-4">
        {totals != null
          ? totals.data.details.line_items.map((totals, index) => (
              <div key={totals.quantity} className="flex items-center justify-between">
                <dt className="text-base text-white">{totals.product.name} x {totals.quantity}</dt>
                <dd className="text-base font-medium text-white">${totals.totals.subtotal / 100}</dd>
              </div>
            ))
          : "..."}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="flex text-base text-white">
            <span>Tax @ {totals != null ? totals.data.details.tax_rates_used[0].tax_rate * 100 : "..."} %</span>
          </dt>
          <dd className="text-base font-medium text-white">
            ${totals != null ? totals.data.details.totals.tax / 100 : "..."}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <dt className="text-xl font-medium text-white">Order total</dt>
          <dd className="text-xl font-medium text-white">
            ${totals != null ? totals.data.details.totals.total / 100 : "..."} /
            {totals != null ? totals.data.items[0].price.billing_cycle.interval : "..."}
          </dd>
        </div>
      </dl>
    </>
  );

  const confirmButton = (
    <button
      type="button"
      className="testClick w-full rounded-xl border-0 bg-yellow-400 px-6 py-4 text-base font-semibold text-black shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-[0.98] min-h-[48px] touch-manipulation"
      onClick={() => {
        setShowPricing(true);
        setShowCheckout(true);
        if (isMobileView) {
          setDrawerSlideIn(false);
          setDrawerOpen(true);
          setTimeout(() => openCheckout(), 50);
        } else {
          openCheckout();
        }
      }}
    >
      Confirm & checkout
    </button>
  );

  return (
    <>
      <div className={`bg-gray-900 ${isMobileView ? "min-h-screen pb-32" : "py-24 sm:py-32"}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Layout toggle: Mobile / Desktop */}
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-pressed={!isMobileView}
                aria-label="Desktop layout"
                className={`rounded-lg p-2 transition ${!isMobileView ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400" : "text-gray-400 hover:text-white"}`}
                onClick={() => setIsMobileView(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                aria-pressed={isMobileView}
                aria-label="Mobile layout"
                className={`rounded-lg p-2 transition ${isMobileView ? "bg-yellow-400/20 text-yellow-400 ring-1 ring-yellow-400" : "text-gray-400 hover:text-white"}`}
                onClick={() => setIsMobileView(true)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <span className="text-sm text-gray-400">
              {isMobileView ? "Mobile view" : "Desktop view"}
            </span>
          </div>

          {!isMobileView ? (
            /* ---------- Desktop layout ---------- */
            <>
              <div className="mx-auto max-w-2xl sm:text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Flexible pricing to suit your needs
                </h2>
                <p className="mt-6 text-lg leading-8 text-white">
                  Distinctio et nulla eum soluta et neque labore quibusdam. Saepe et
                  quasi iusto modi velit ut non voluptas in. Explicabo id ut laborum.
                </p>
              </div>
              <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-yellow-400 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                <div id="checkout-frame" className={showCheckout ? "checkout-frame bg-[#F3EFEC] p-10 sm:p-12 sm:flex-auto my-2 ml-2 rounded-2xl" : "checkout-frame hidden"}></div>
                {!showPricing ? (
                  <div className="p-8 sm:p-10 lg:flex-auto">
                    <h3 className="text-2xl font-bold tracking-tight text-white">
                      You&apos;ve chosen {totals != null ? totals.data.details.line_items[0].product.name : "..."}
                    </h3>
                    <p className="mt-6 text-base leading-7 text-white">
                      Now tailor your package to your exact requirements by customising your number of seats & addons below.
                    </p>
                    <p className="mt-6 text-base leading-7 text-white">Start with your core number of seats for your plan:</p>
                    <HStack maxW="150px" mt={4} mb={4}>
                      <Button colorScheme={"yellow"} {...dec} onClick={() => setQuantity(input.value)}>-</Button>
                      <Input className="text-white" {...input} />
                      <Button colorScheme={"yellow"} {...inc} onClick={() => setQuantity(input.value)}>+</Button>
                    </HStack>
                    <div className="mt-10 flex items-center gap-x-4">
                      <h4 className="flex-none text-lg font-semibold leading-6 text-yellow-400">Addons</h4>
                      <div className="h-px flex-auto bg-gray-100" />
                    </div>
                    <ul role="list" className="mt-8 grid gap-4 text-lg leading-6 text-white">
                      {options.map((option, index) => (
                        <li key={index} className="flex gap-4">
                          <Button colorScheme={"yellow"} onClick={() => addItem({ price_id: option.price_id[frequency], quantity: 1 })}>
                            {option.name}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                  <div className="bg-white/10 rounded-2xl bg-gray-50 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-24">
                    <div className="mx-auto max-w-xs px-4">
                      {planSummaryContent}
                      <div className="mt-6">{confirmButton}</div>
                      <button
                        type="button"
                        className="w-full rounded-md border border-transparent bg-yellow-400 mt-2 px-4 py-3 text-base font-medium text-black"
                        onClick={() => {
                          const iframeElement = document.querySelector(".paddle-frame");
                          if (iframeElement?.contentWindow?.document) iframeElement.contentWindow.document.querySelector(".sc-jrQzAO")?.click();
                        }}
                      >
                        Update Items
                      </button>
                      <p className="mt-6 text-xs leading-5 text-white">Your receipt will be accessible in your account area & sent to your email.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ---------- Mobile-optimized layout ---------- */
            <div className="mx-auto max-w-[420px] px-2 sm:px-4">
              <div className="sm:text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">Flexible pricing</h2>
                <p className="mt-2 text-base text-gray-300">Tailor your plan below, then checkout on your device.</p>
              </div>

              {/* Mobile: checkout lives in bottom drawer, not inline here */}

              {!showPricing ? (
                <div className="space-y-8">
                  <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
                    <h3 className="text-lg font-bold text-white">
                      {totals != null ? totals.data.details.line_items[0].product.name : "Your plan"}
                    </h3>
                    <p className="mt-2 text-sm text-gray-300">Customise seats and add-ons.</p>
                    <p className="mt-4 text-sm text-white">Seats</p>
                    <HStack maxW="100%" mt={2} mb={4} className="[&_button]:min-h-[44px] [&_input]:min-h-[44px]">
                      <Button colorScheme={"yellow"} size="lg" {...dec} onClick={() => setQuantity(input.value)}>-</Button>
                      <Input className="text-white text-center" {...input} />
                      <Button colorScheme={"yellow"} size="lg" {...inc} onClick={() => setQuantity(input.value)}>+</Button>
                    </HStack>
                    <p className="text-sm text-yellow-400 font-medium mt-6">Add-ons</p>
                    <ul className="mt-3 grid gap-2">
                      {options.map((option, index) => (
                        <li key={index}>
                          <button
                            type="button"
                            onClick={() => addItem({ price_id: option.price_id[frequency], quantity: 1 })}
                            className="w-full min-h-[48px] rounded-xl bg-white/10 text-white font-medium ring-1 ring-white/20 hover:bg-white/20 active:scale-[0.99] touch-manipulation text-left px-4"
                          >
                            {option.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
                    <div className="text-center">{planSummaryContent}</div>
                  </section>
                </div>
              ) : (
                <section className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
                  <div className="text-center">{planSummaryContent}</div>
                </section>
              )}

              {/* Sticky bottom CTA (mobile checkout convention) */}
              <div className="fixed bottom-0 left-0 right-0 z-10 bg-gray-900/95 backdrop-blur border-t border-white/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-[420px] flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="text-xl font-bold text-white truncate">
                      ${totals != null ? totals.data.details.totals.total / 100 : "0"} /
                      {totals != null ? totals.data.items[0].price.billing_cycle.interval : "—"}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-[180px]">{confirmButton}</div>
                </div>
              </div>

              {/* Bottom drawer: checkout (mobile only) */}
              {drawerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/50 transition-opacity"
                    aria-hidden
                    onClick={() => setDrawerOpen(false)}
                  />
                  <div
                    className="fixed left-0 right-0 bottom-0 z-40 max-h-[90vh] rounded-t-2xl bg-[#F3EFEC] shadow-2xl transition-transform duration-300 ease-out flex flex-col"
                    style={{ transform: drawerSlideIn ? "translateY(0)" : "translateY(100%)" }}
                  >
                    <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200/80">
                      <div className="w-10" aria-hidden />
                      <div className="w-10 h-1 rounded-full bg-gray-300 flex-shrink-0" aria-hidden />
                      <button
                        type="button"
                        aria-label="Close checkout"
                        className="p-2 -m-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200/80"
                        onClick={() => setDrawerOpen(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 pb-8 min-h-[320px]">
                      <div
                        id="checkout-frame"
                        className="checkout-frame w-full min-h-[280px] rounded-xl overflow-hidden"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
