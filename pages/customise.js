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

  var request = {
    items: [
      {
        quantity: 1,
        priceId: "pri_01gxzd0kvx4tjy8ewsw72gjsbc",
      },
    ],
    // discountId: 'dsc_01h1q81nhwchjp2pf5cws8w5c7',
    address: {
      countryCode: "US",
    },
  };

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

  // confirm button load price
  useEffect(() => {
    if (params[0].price_id === null) {
    } else {
      //grab subsequent prices
      const getApiData = async () => {
        const response = await fetch("http://localhost:3000/api/pricePreview", {
          method: "POST",
          body: JSON.stringify(params),
        });
        const data = await response.json();
        const prices = data.data;

        setTotals(prices);

      };
      getApiData();
    }
  }, [params]);

  const [paddle, setPaddle] = useState();

  const [t0, setT0] = useState(0);

  useEffect(() => {
		initializePaddle({ environment: 'sandbox', token: 'test_4cd800f93e1f3c8969c57bea9f2', eventCallback: (event) => {
      if (event.name === 'checkout.loaded') {
        const t1 = performance.now();
        console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
      }
      console.log(event)
    } }).then(
      (paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      },
    ).catch((error) => {
      console.log(error);
      if (errorCallback) {
        errorCallback(error);
      }
    });
  }, [t0]);
	
		// Callback to open a checkout
		const openCheckout = () => {
      setT0(performance.now())
			paddle?.Checkout.open({
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en",
          variant: "one-page",
          frameTarget: "checkout-frame",
          frameStyle: "min-width: 400px; width: 100%;",
          frameInitialHeight: "450",
          allowLogout: false,
          // showAddTaxId: true,
          // showAddDiscounts: false,
        },
        // savedPaymentMethodId: 'paymtd_01jphtxw9pfawcm61yx1715xn9',
        // customer: {
        //   // id: 'ctm_01jnnq84zpted6thntpnrqwejp',
        //   // address: {
        //   //   id: 'add_01jnnvqkmf126gwqz428tb15gx'
        //   // }
        //     // email: "chafik+tax2025@paddle.com",
        //     // name: "Chafik",
        //     // address: {
        //     //     countryCode: "TR",
        //     // }
        // },
        // customerAuthToken: "pca_01jphtvrdpyamtggp19n35nq69_01jphtgd8860q269yc3j3r9f16_c6orbqu3n5zbhtc4ynbioqhzr7dieokk",
        // customData: {test: '12345'},
        // allowedPaymentMethods: [
        //   'paypal',
        // ],
        // transactionId: 'txn_01jnp3q06b90mzrq42sbwqvgjg',
        // items: params,
        items: [
            {
                price_id: 'pri_01jma3850henn69fxvnhs8zber',
                quantity: 1
            },
        ]
        // discountId: 'dsc_01h1q81pey792mw2rqntr4wgcx'
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

  return (
    <>
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl sm:text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Flexible pricing to suit your needs
            </h2>
            <p className="mt-6 text-lg leading-8 text-white">
              Distinctio et nulla eum soluta et neque labore quibusdam. Saepe et
              quasi iusto modi velit ut non voluptas in. Explicabo id ut
              laborum.
            </p>
            {/* <Button
              onClick={() => {
                console.log("hi pricing");
                Paddle.PricePreview(request)
                  .then((result) => {
                    console.log(result);
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              }}
            ></Button> */}
          </div>
          <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-yellow-400 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
            <div
              className={
                showCheckout
                  ? "checkout-frame bg-white p-8 sm:p-10 sm:flex-auto my-2 ml-2 rounded-2xl"
                  : "checkout-frame hidden"
              }
            ></div>
            {!showPricing ? (
              <div className="p-8 sm:p-10 lg:flex-auto">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  You&apos;ve chosen{" "}
                  {totals != null
                    ? totals.data.details.line_items[0].product.name
                    : "..."}
                </h3>
                <p className="mt-6 text-base leading-7 text-white">
                  Now tailor your package to your exact requirements by
                  customising your number of seats & addons below. If
                  you&apos;ve got a discount code, you can enter it here or
                  after you&apos;ve purchased.
                </p>
                {/* <p className="mt-6 text-base leading-7 text-white">
                        Hint: Use code 9DNYSV493B for 15% off your first 3 months!
                        </p> */}
                <p className="mt-6 text-base leading-7 text-white">
                  Start with your core number of seats for your plan:
                </p>
                <HStack maxW="150px" mt={4} mb={4}>
                  <Button
                    colorScheme={"yellow"}
                    {...dec}
                    onClick={() => setQuantity(input.value)}
                  >
                    -
                  </Button>
                  <Input className="text-white" {...input} />
                  <Button
                    colorScheme={"yellow"}
                    {...inc}
                    onClick={() => setQuantity(input.value)}
                  >
                    +
                  </Button>
                </HStack>
                <div className="mt-10 flex items-center gap-x-4">
                  <h4 className="flex-none text-lg font-semibold leading-6 text-yellow-400">
                    Addons
                  </h4>
                  <div className="h-px flex-auto bg-gray-100" />
                </div>
                <ul
                  role="list"
                  className="mt-8 grid gap-4 text-lg leading-6 text-white"
                >
                  {options.map((option, index) => (
                    <li key={index} className="flex gap-4">
                      <Button
                        colorScheme={"yellow"}
                        onClick={() =>
                          addItem({
                            price_id: option.price_id[frequency],
                            quantity: 1,
                          })
                        }
                      >
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
                  <h2
                    id="summary-heading"
                    className="text-3xl font-medium text-white"
                  >
                    Plan summary
                  </h2>
                  <dl className="mt-6 space-y-4">
                    {totals != null
                      ? totals.data.details.line_items.map((totals, index) => (
                          <div
                            key={totals.quantity}
                            className="flex items-center justify-between"
                          >
                            <dt className="text-base text-white">
                              {totals.product.name} x {totals.quantity}
                            </dt>
                            <dd className="text-base font-medium text-white">
                              ${totals.totals.subtotal / 100}
                            </dd>
                          </div>
                        ))
                      : "..."}
                    {/* <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <dt className="flex items-center text-base text-white">
                        <span>Discount</span>
                      </dt>
                      <dd className="text-base font-medium text-white">
                        $
                        {totals != null
                          ? totals.data.details.totals.discount / 100
                          : 0}
                      </dd>
                    </div> */}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <dt className="flex text-base text-white">
                        <span>
                          Tax @{" "}
                          {totals != null
                            ? totals.data.details.tax_rates_used[0].tax_rate *
                              100
                            : "..."}
                          %
                        </span>
                      </dt>
                      <dd className="text-base font-medium text-white">
                        $
                        {totals != null
                          ? totals.data.details.totals.tax / 100
                          : "..."}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <dt className="text-xl font-medium text-white">
                        Order total
                      </dt>
                      <dd className="text-xl font-medium text-white">
                        $
                        {totals != null
                          ? totals.data.details.totals.total / 100
                          : "..."}{" "}
                        /
                        {totals != null
                          ? totals.data.items[0].price.billing_cycle.interval
                          : "..."}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <button
                      type="submit"
                      className="w-full rounded-md border border-transparent bg-yellow-400 px-4 py-3 text-base font-medium text-black shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-50"
                      onClick={() => {
                        setShowPricing(true);
                        setShowCheckout(true);
                        openCheckout();
                      }}
                    >
                      Confirm
                    </button>

                    <button 
                     type="submit"
                     className="w-full rounded-md border border-transparent bg-yellow-400 mt-2 px-4 py-3 text-base font-medium text-black shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-50"
                     onClick={() => {
                      updateCheckout();
                     }}>
                      Update Items
                    </button>
                  </div>
                  <p className="mt-6 text-xs leading-5 text-white">
                    Your receipt will be accessible in your account area & sent
                    to your email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
