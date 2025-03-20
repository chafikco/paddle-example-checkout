'use client'

import { useEffect, useState } from "react";
import { useNumberInput, Button, Image } from "@chakra-ui/react";
import { initializePaddle } from '@paddle/paddle-js';
import { Transition } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function Order() {
     // initial array configuration for plan
  const [params, setParams] = useState({
			quantity: 1,
			priceId: "pri_01jmzdpbsxhtnja9ntsx6q2s55"
  });

  useEffect(() => {
	console.log(params);
  }, [params])

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

  // -------- all above is quantity component

  const [totals, setTotals] = useState(null);

  //state for toast message
  const [show, setShow] = useState(false)

  //order info for toast message
  const [orderInfo, setOrderInfo] = useState({
    id: null
  })

  const [paddle, setPaddle] = useState();

  useEffect(() => {
    if (!paddle?.Initialized) {
      initializePaddle({
        token: 'test_9793e7e6dfc5136c877604b5733',
        environment: 'sandbox',
        eventCallback: (event) => {
          console.log(event)
        },
        checkout: {
          settings: {
            displayMode: 'inline',
            theme: 'light',
            variant: 'one-page',
            frameTarget: 'checkout-frame',
            frameInitialHeight: 450,
            frameStyle: 'width: 100%; background-color: transparent; border: none',
            // successUrl: '/checkout/success',
            showAddDiscounts: false,
            showAddTaxId: false
          },
        },
      }).then(async (paddle) => {
        if (paddle && params.priceId) {
          setPaddle(paddle);
          paddle.Checkout.open({
            items: 
            [{ 
              priceId: params.priceId, 
              quantity: params.quantity
            }],
            customer: {
                email: "chafik+tax2025@paddle.com",
                name: "Chafik",
                address: {
                    countryCode: "GB",
                    postalCode: "E8 2HL"
                }
            },
          });
        }
      });
    }
  }, [paddle?.Initialized, params.priceId]);

  useEffect(() => {
    if (paddle && params.priceId && paddle.Initialized) {
      paddle?.PricePreview({
        items: [{
            quantity: params.quantity,
            priceId: params.priceId,
          },
        ],
        address: {
          countryCode: 'GB'
        }
      }).then((result) => {
          setTotals(result)
        })
        .catch((error) => {
          console.error(error);
        });
      }
  }, [paddle, params.priceId, params.quantity])

  useEffect(() => {
    if (paddle && params.priceId && paddle.Initialized) {
      paddle.Checkout.updateItems([{ priceId: params.priceId, quantity: params.quantity }]);
    }
  }, [paddle, params.priceId, params.quantity]);

  return (
    <>
      <div className="bg-[#f6f7fb] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl min-w-4xl px-6 lg:px-8">
          <div className="m-auto max-w-2xl text-center items-center">
            <div className="flex justify-center text-center items-center">
                <div className="mr-4 bg-[#e0ff6e] text-[#416467] items-center rounded-[8px] inline-flex h-[36px] justify-center w-[36px]">
                    <svg className="text-[#416467] inline-block h-[20px] w-[20px]" viewBox="0 0 51 52">
                        <path className="fill-[#416467]" d="M6.81553 17.7409C2.93463 21.7777 0 25.0328 0 25.5019C0 25.9688 2.95144 29.1967 6.84763 33.2083C6.94908 38.8389 7.1478 43.23 7.42256 43.5048C7.69837 43.7806 12.1164 43.9846 17.7727 44.0903C21.8445 48.0193 25.1101 51.0035 25.5 51.0035C25.889 51.0035 29.1415 48.0389 33.2012 44.1287C38.7806 44.0474 43.1418 43.848 43.485 43.5048C43.8295 43.1602 44.0599 38.7966 44.1697 33.2149C48.0573 29.2121 51 25.9872 51 25.5019C51 25.0133 48.0625 21.7495 44.1788 17.7106C44.0746 12.1488 43.8454 7.80039 43.485 7.43999C43.1253 7.08024 38.7874 6.85588 33.2359 6.75592C29.2373 2.90481 26.0089 0.000183105 25.5 0.000183105C24.991 0.000183105 21.7614 2.91259 17.7618 6.77119C12.1478 6.88101 7.75483 7.1077 7.42256 7.43999C7.09225 7.77033 6.89685 12.1446 6.81553 17.7409Z">
                        </path>
                        <path className="fill-[#e0ff6e]" d="M30.128 21.9237C30.0061 21.9069 29.8891 21.8644 29.7848 21.7991C29.6805 21.7338 29.5912 21.6471 29.5229 21.5447C29.4546 21.4424 29.4088 21.3267 29.3885 21.2054C29.3683 21.0841 29.374 20.9598 29.4053 20.8408L30.7532 15.6648C30.7868 15.5357 30.7904 15.4006 30.7637 15.2699C30.7369 15.1393 30.6806 15.0164 30.599 14.9109C30.5174 14.8054 30.4127 14.7199 30.2929 14.6611C30.1731 14.6023 30.0414 14.5717 29.9079 14.5717H21.8524C20.0053 14.5735 18.2277 15.2757 16.8786 16.5366C15.5295 17.7974 14.7095 19.523 14.5842 21.3646C14.4589 23.2063 15.0376 25.0269 16.2035 26.4587C17.3693 27.8904 19.0354 28.8267 20.8653 29.0783C20.9872 29.0953 21.1041 29.1379 21.2083 29.2032C21.3125 29.2686 21.4017 29.3553 21.4699 29.4576C21.5382 29.5599 21.584 29.6755 21.6044 29.7967C21.6248 29.918 21.6192 30.0422 21.588 30.1612L20.2402 35.3372C20.2065 35.4663 20.2029 35.6014 20.2297 35.7321C20.2564 35.8627 20.3127 35.9856 20.3943 36.0911C20.476 36.1966 20.5807 36.2821 20.7005 36.3409C20.8203 36.3997 20.952 36.4303 21.0854 36.4303H29.1409C30.9881 36.4285 32.7657 35.7263 34.1147 34.4654C35.4638 33.2046 36.2838 31.479 36.4091 29.6374C36.5345 27.7957 35.9557 25.9751 34.7899 24.5433C33.624 23.1116 31.9579 22.1753 30.128 21.9237V21.9237ZM29.9817 29.1418H22.6148C22.4215 29.1416 22.2338 29.0774 22.0808 28.9592C21.9279 28.8411 21.8185 28.6756 21.7696 28.4887L20.3275 22.9509C20.2939 22.8219 20.2903 22.6868 20.317 22.5561C20.3438 22.4255 20.4001 22.3026 20.4817 22.1971C20.5633 22.0916 20.668 22.0061 20.7878 21.9473C20.9076 21.8885 21.0393 21.8579 21.1728 21.8579H28.5385C28.732 21.8579 28.92 21.922 29.0732 22.0402C29.2263 22.1583 29.3359 22.3239 29.3849 22.511L30.8269 28.0488C30.8606 28.1779 30.8641 28.3129 30.8374 28.4436C30.8107 28.5743 30.7544 28.6971 30.6727 28.8026C30.5911 28.9082 30.4864 28.9936 30.3666 29.0524C30.2468 29.1112 30.1151 29.1418 29.9817 29.1418Z">
                        </path>
                    </svg>
                </div>
                <h2 className="text-[26px] font-bold tracking-tight text-[#2f3e4e]">
                Try 30 days of Premium for free!
                </h2>
            </div>
            <p className="mt-2 text-[17px] leading-8 text-[#2f3e4e]">
            Get unlimited access to <span className="font-bold">47,288,677</span> summaries, exam prep and lecture notes.
            </p>
          </div>
          <div className="bg-[#fff] m-auto mt-12 max-w-[700px] rounded-3xl p-[32px]">
            <div class="flex justify-between text-center items-center mb-[16px]">
                <span class="font-bold">
                    Your plan
                </span>
                <span class="font-bold text-[#3092fa]" data-content="true">
                    Change plan
                </span>
            </div>
            <div className="bg-[#365356] text-white rounded-[20px] overflow-hidden py-[16px] px-[40px] relative mb-[24px]">
                <div className="items-center flex justify-between relative w-full z-[1]">
                    <div class="mb-0 text-left flex flex-col">
                        <span class="text-[28px] font-bold mb-0 leading-[110%]">
                            Standard
                        </span>
                        <span class="text-[18px] font-bold mt-0 leading-[130%]">
                            Premium
                        </span>
                    </div>
                    <ul className="mb-0 flex flex-col gap-[8px]">
                        <li className="items-center flex gap-[8px]">
                            <svg aria-hidden="true" focusable="false" data-prefix="fad" data-icon="circle-check" className="overflow-hidden h-[1em] " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                <g class="fa-duotone-group">
                                    <path className="fill-[#eaff9e] opacity-[0.4]" fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z">
                                    </path>
                                    <path class="fa-primary" fill="currentColor" d="M369 175c9.4 9.4 9.4 24.6 0 33.9L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0z">
                                    </path>
                                </g>
                            </svg>
                            <span className=" font-bold text-[14px] leading-[130%]">
                                Read Premium documents
                            </span>
                        </li>
                        <li className="items-center flex gap-[8px]">
                            <svg aria-hidden="true" focusable="false" data-prefix="fad" data-icon="circle-check" className="overflow-hidden h-[1em] " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                <g class="fa-duotone-group">
                                    <path className="fill-[#eaff9e] opacity-[0.4]" fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z">
                                    </path>
                                    <path class="fa-primary" fill="currentColor" d="M369 175c9.4 9.4 9.4 24.6 0 33.9L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0z">
                                    </path>
                                </g>
                            </svg>
                            <span className=" font-bold text-[14px] leading-[130%]">
                                Download documents
                            </span>
                        </li>
                    </ul>
                    <svg width="150" height="88" viewBox="0 0 182 105" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_3699_168464)">
                            <path className="fill-[#617E80]" d="M85.096 103.427C50.5762 103.427 18.445 81.9127 21.9241 61.6688C25.4032 41.425 87.0903 7.91448 112.244 13.3919C137.397 18.8693 159.459 56.7316 155.75 77.7408C152.042 98.7499 114.366 103.427 85.096 103.427Z">
                            </path>
                            <path className="fill-[#ECD7FF]" d="M121.11 89.7939H60.2594C60.0369 78.4097 60.4339 66.8711 61.676 55.6614C62.0529 52.2645 65.5088 49.3803 68.8674 49.1054C84.7703 48.1126 100.649 47.9212 116.558 48.8707C120.265 49.0792 123.761 51.6052 123.262 57.3629C122.223 69.3833 121.528 78.2831 121.756 89.1577C121.759 89.2428 121.744 89.3274 121.712 89.4064C121.681 89.4854 121.633 89.557 121.572 89.6168C121.512 89.6765 121.439 89.7231 121.36 89.7535C121.28 89.784 121.195 89.7977 121.11 89.7939Z">
                            </path>
                            <path className="fill-[#B69DFC]" d="M116.552 87.4093C100.007 87.2672 83.4614 87.2049 66.9168 87.2224C65.2885 87.2024 64.0156 85.9347 64.0279 84.386C64.2365 75.2963 64.873 66.2405 65.8509 57.1971C65.9659 56.4144 66.3412 55.6932 66.9162 55.1495C67.4913 54.6059 68.2326 54.2715 69.0209 54.2001C85.1154 53.3108 101.196 53.1008 117.3 53.8836C118.944 53.984 120.176 55.3165 120.061 56.8883C119.317 66.1525 118.953 75.4167 119.331 84.7072C119.393 86.2219 118.129 87.4201 116.552 87.4093Z">
                            </path>
                            <path className="fill-[#2B4345]" d="M90.3115 81.6075C90.3115 81.6075 90.9513 82.0257 91.3405 82.0496C91.7297 82.0734 92.4221 81.7368 92.4221 81.7368C92.4221 81.7368 98.1922 75.4847 100.146 73.6881C100.631 73.24 100.471 72.7188 99.8008 72.5308C98.7489 72.2346 97.5034 72.821 96.4318 72.5308C95.7466 72.3462 95.1301 71.585 95.0857 70.8313C94.8808 70.9164 94.8127 62.0221 94.81 60.6052C94.8073 59.1882 88.4077 59.562 88.4077 59.562C88.4077 59.562 87.3253 59.7154 87.2115 60.5464C86.7659 63.7744 87.7789 68.3293 87.6853 71.5832C87.6681 72.3647 87.2731 72.5164 86.4422 72.5308C85.6113 72.5452 84.5735 72.5308 83.5162 72.5308C82.459 72.5308 83.7199 74.3279 83.7199 74.3279C83.7199 74.3279 87.0067 78.365 90.3047 81.6049">
                            </path>
                            <path className="fill-[#E0FF6E]" d="M92.8125 51.8281C93.4305 51.2831 93.5711 50.1976 93.0613 49.7081C92.5515 49.2187 91.2677 49.3777 90.6435 49.9089C90.0194 50.44 90.0071 51.5193 90.5231 52.0242C91.039 52.5291 92.1946 52.3716 92.8125 51.8281Z">
                            </path>
                            <path className="fill-[#F064FC]" d="M122.482 95.4389C100.956 95.9175 79.4437 96.1445 57.9175 95.6056C56.7712 95.5763 55.3252 94.707 54.6732 93.3591C54.3079 92.6096 53.9951 91.8358 53.737 91.043C53.3384 89.8788 54.0614 88.8891 55.0594 88.9308C78.6543 89.8989 102.271 90.1521 125.859 88.8736C126.822 88.8196 127.546 89.8356 127.202 91.0585C127.046 91.6492 126.853 92.2294 126.623 92.7955C125.932 94.46 124.225 95.374 122.482 95.4389Z">
                            </path>
                            <path className="fill-[#2B4345]" d="M83.8765 90.1572C84.0233 90.4799 84.0959 90.6498 84.2427 90.9987C84.266 91.0759 84.3115 91.1444 84.3736 91.1958C84.4357 91.2471 84.5116 91.279 84.5918 91.2875C88.6085 91.3194 92.6252 91.3261 96.6418 91.3075C96.7287 91.2959 96.8109 91.2611 96.8796 91.2067C96.9484 91.1524 97.0013 91.0805 97.0327 90.9987C97.2104 90.6513 97.2999 90.483 97.4791 90.1619C97.6893 89.7882 97.5518 89.3744 97.2289 89.3759C92.9032 89.4006 88.5776 89.3914 84.2519 89.3481C83.9198 89.3466 83.7082 89.782 83.8765 90.1572Z">
                            </path>
                            <path d="M99.0518 38.6791C94.9378 41.2311 78.1195 35.46 76.0621 32.8927C73.4268 29.6061 81.8229 5.71308 84.0395 2.21096C85.9086 -0.741923 105.57 3.80481 106.739 6.58274C107.975 9.52306 101.538 37.135 99.0518 38.6791Z" fill="#F4F4F0"
                            ></path>
                            <path d="M100.047 24.7429C94.4586 24.613 80.5628 21.051 81.2039 18.206C81.8582 15.2916 84.3938 6.60747 86.006 5.51137C87.5708 4.4453 105.268 8.54597 104.607 11.6156C104.085 13.9819 101.419 24.776 100.047 24.7429Z" fill="#B69DFC">
                            </path>
                            <path d="M81.2095 18.5197C81.2095 18.5197 83.4945 16.1491 88.0554 17.4383C92.6164 18.7275 93.6875 22.5896 96.0359 19.03C97.8824 16.2383 101.378 14.8472 103.707 15.2512C103.707 15.2512 103.349 16.6017 102.845 18.4224C102.312 20.3878 101.359 24.4878 100.185 24.8274C99.0109 25.167 89.4782 23.1287 86.5037 22.033C81.4816 20.1732 80.8015 19.154 81.2095 18.5197Z" fill="#F064FC">
                            </path>
                            <path d="M97.378 13.4618C97.2636 15.0814 95.5192 16.7072 93.8969 16.5949C92.2746 16.4827 90.7351 14.3723 90.8497 12.7384C90.9643 11.1045 92.9391 9.70065 94.5757 9.81513C96.2123 9.9296 97.4945 11.8423 97.378 13.4618Z" fill="#F36A1C">
                            </path>
                            <path d="M131.61 49.3313C126.742 47.6533 121.878 45.9605 117 44.3158C114.544 43.4893 113.061 40.8422 114.311 38.4402C118.462 31.0804 122.854 24.5317 125.164 16.2944C125.878 13.5596 127.919 10.6715 131.11 11.3313C135.787 12.5172 140.497 13.5743 145.181 14.7417C147.92 15.5057 148.959 18.4468 148.008 20.9487C144.895 29.4051 141.482 37.7411 138.277 46.1614C137.803 47.4516 136.84 48.5051 135.595 49.0973C134.349 49.6895 132.919 49.7734 131.61 49.3313Z" fill="#F4F4F0">
                            </path>
                            <path d="M143.196 25.5789C142.457 26.2504 141.119 26.2982 140.575 25.6342C140.031 24.9702 140.39 23.4532 141.133 22.7717C141.877 22.0901 143.218 22.2132 143.752 22.8883C144.287 23.5634 143.934 24.9094 143.196 25.5789Z" fill="#F064FC">
                            </path>
                            <path d="M139.37 22.6097C139.523 22.9046 137.325 22.7793 134.474 22.2857C133.826 22.1759 133.154 22.0603 132.498 21.9441C129.661 21.4404 127.183 20.7337 126.88 20.4445C126.577 20.1553 128.622 20.3929 131.585 20.8962C132.265 21.0123 132.948 21.1247 133.634 21.2334C136.617 21.7102 139.224 22.3074 139.376 22.6065" fill="#F36A1C">
                            </path>
                            <path d="M128.31 23.2399C128.28 22.9974 129.514 23.0206 131.048 23.3208L132.122 23.5328C133.656 23.842 134.995 24.3096 135.116 24.5318C135.237 24.754 134.042 24.6621 132.431 24.3652L131.319 24.1639C129.702 23.8792 128.347 23.484 128.319 23.242" fill="#F36A1C">
                            </path>
                            <path d="M138.362 25.0378C138.242 25.2323 137.71 25.3457 137.216 25.249L136.876 25.1768C136.388 25.0706 136.065 24.8121 136.145 24.6415C136.225 24.4709 136.677 24.4252 137.205 24.5122L137.572 24.5686C138.109 24.6445 138.483 24.837 138.358 25.0368" fill="#F36A1C">
                            </path>
                            <path d="M139.801 33.9837C139.032 34.612 137.647 34.5745 137.099 33.8916C136.551 33.2086 136.96 31.76 137.745 31.14C138.53 30.52 139.887 30.6695 140.424 31.3498C140.962 32.0302 140.569 33.3553 139.801 33.9837Z" fill="#F064FC">
                            </path>
                            <path d="M135.944 30.8993C136.098 31.1921 133.838 30.9489 130.954 30.3462L128.956 29.9255C126.096 29.3175 123.655 28.5933 123.373 28.3314C123.09 28.0696 125.127 28.3636 128.094 28.946C128.774 29.0816 129.462 29.2146 130.152 29.346C133.162 29.9235 135.789 30.6039 135.945 30.8972" fill="#F36A1C">
                            </path>
                            <path d="M124.595 30.8208C124.581 30.6046 125.836 30.7 127.386 31.0714L128.463 31.3356C130.017 31.7171 131.373 32.2468 131.49 32.4658C131.608 32.6849 130.378 32.513 128.739 32.1265C128.364 32.0344 127.987 31.9464 127.609 31.8625C125.967 31.4887 124.61 31.0439 124.594 30.8251" fill="#F36A1C">
                            </path>
                            <path d="M134.828 33.1721C134.697 33.364 134.148 33.4263 133.644 33.3002L133.293 33.2142C132.795 33.0785 132.478 32.8126 132.557 32.6531C132.637 32.4936 133.112 32.4826 133.651 32.5992L134.028 32.6782C134.578 32.7842 134.957 32.9935 134.826 33.1785" fill="#F36A1C">
                            </path>
                            <path d="M136.367 42.1609C135.594 42.7366 134.165 42.5964 133.575 41.8629C132.985 41.1294 133.369 39.6994 134.17 39.1347C134.97 38.57 136.385 38.8322 136.946 39.5563C137.507 40.2803 137.141 41.5853 136.367 42.1609Z" fill="#F064FC">
                            </path>
                            <path d="M132.308 38.7581C132.472 39.0625 130.131 38.6312 127.144 37.7841L125.087 37.2011C122.142 36.3597 119.66 35.4642 119.373 35.1923C119.087 34.9205 121.154 35.3473 124.197 36.1521C124.896 36.3393 125.603 36.5308 126.31 36.7154C128.329 37.2468 130.445 37.7616 132.298 38.7444" fill="#F36A1C">
                            </path>
                            <path d="M120.659 37.7634C120.639 37.5345 121.917 37.7317 123.508 38.2385L124.618 38.587C126.218 39.1007 127.627 39.7463 127.754 39.979C127.882 40.2118 126.616 39.9392 124.926 39.4147C124.537 39.2924 124.15 39.1728 123.762 39.0574C122.072 38.5488 120.679 37.9944 120.657 37.7718" fill="#F36A1C">
                            </path>
                            <path d="M131.216 40.9518C131.089 41.1288 130.524 41.1559 130.001 40.9849C129.878 40.9547 129.757 40.9071 129.639 40.8647C129.121 40.6885 128.787 40.3894 128.865 40.2272C128.943 40.0651 129.431 40.0974 129.984 40.2576L130.371 40.3683C130.941 40.5196 131.339 40.7626 131.211 40.9418" fill="#F36A1C">
                            </path>
                            <path d="M50.0963 52.9855C57.7199 52.2421 68.4335 40.8199 67.6929 37.4029C67.0948 34.6373 63.7913 35.2521 56.8875 26.2283C51.4201 19.0782 51.9872 14.5529 49.3336 13.4052C46.8249 12.3185 33.1716 18.6612 30.7808 22.7745C28.4766 26.7308 46.1027 53.3701 50.0963 52.9855Z" fill="#F4F4F0">
                            </path>
                            <path d="M60.4655 36.1977C60.8287 36.1778 59.2731 37.8875 56.9946 39.951L55.4122 41.3817C53.1284 43.4345 50.8865 45.1974 50.4414 45.3418C49.9963 45.4863 51.5682 43.8805 53.9218 41.7267C54.4632 41.2291 55.0045 40.7335 55.5461 40.2338C57.8951 38.0612 60.0999 36.2235 60.4651 36.2038" fill="#F064FC">
                            </path>
                            <path d="M57.6111 32.2653C57.9772 32.26 56.3488 33.9043 53.9839 35.8685L52.3432 37.233C49.9726 39.1905 47.6584 40.8574 47.2066 40.9828C46.7548 41.1083 48.3952 39.5696 50.8398 37.5093L52.5264 36.085C54.9659 34.012 57.2474 32.2666 57.6113 32.2632" fill="#F064FC">
                            </path>
                            <path d="M43.7678 36.9903C43.4046 36.961 45.1842 35.4786 47.7278 33.7441C48.3164 33.3406 48.9055 32.9397 49.495 32.5417C52.0441 30.8159 54.5086 29.3745 54.9712 29.293C55.4338 29.2115 53.6503 30.589 51.0216 32.4108C50.4169 32.8268 49.812 33.2461 49.2067 33.6689C46.5588 35.4995 44.1209 37.0189 43.7678 36.9903Z" fill="#F064FC">
                            </path>
                            <path d="M51.9682 24.426C52.3315 24.4554 50.5116 25.9017 47.922 27.5709L46.1255 28.7279C43.5264 30.3861 41.028 31.7652 40.5642 31.8364C40.1003 31.9076 41.9193 30.574 44.5999 28.822L46.4501 27.6098C49.1282 25.8371 51.609 24.397 51.9682 24.426Z" fill="#F064FC">
                            </path>
                            <path d="M50.3629 20.0999C50.722 20.1556 48.8323 21.4999 46.1585 23.0412C45.5405 23.4014 44.9223 23.7561 44.3038 24.1054C41.6271 25.6321 39.0569 26.8825 38.5912 26.9248C38.1256 26.9671 40.0086 25.731 42.7766 24.1172C43.4146 23.7464 44.0514 23.374 44.6869 23.0002C47.4495 21.3778 50.0041 20.0401 50.3631 20.0978" fill="#F064FC">
                            </path>
                        </g>
                        <defs>
                            <clipPath id="clip0_3699_168464">
                                <rect width="180.267" height="104" fill="white" transform="translate(0.759277 0.333984)">
                                </rect>
                            </clipPath>
                        </defs>
                    </svg>
                </div>
                <svg className="fill-[#2b4345] overflow-hidden left-[-5%] absolute top-[-20%] rotate-[79deg]" viewBox="0 0 395 334" width="320"><path d="M360.732 20.9143C312.872 -15.468 230.976 -0.860668 210.716 50.4883C190.456 101.837 194.659 167.842 178.272 177.632C161.885 187.422 124.326 175.272 67.3695 193.531C10.4133 211.79 -14.7204 268.461 10.3065 300.667C33.0327 329.911 69.7285 342.324 117.239 328.095C184.165 308.049 189.796 220.046 201.416 204.982C213.036 189.918 282.962 211.78 344.588 184.246C406.213 156.712 408.592 57.2869 360.732 20.9143Z"></path></svg>
                <svg className="fill-[#2b4345] overflow-hidden left-[17%] absolute top-[-17%] rotate-[328deg]" viewBox="0 0 33 43" width="59"><path d="M32.7634 16.6301C33.1517 26.1772 26.1911 37.395 17.2308 41.2896C-0.243426 48.8749 0.542891 24.0114 0.523475 22.1466C0.397273 10.9872 7.50344 1.53714 16.2017 0.779577C24.9 0.022018 32.3653 7.04402 32.7634 16.6301Z"></path></svg>
                <svg className="fill-[#2b4345] overflow-hidden right-[-15%] absolute top-[20%] rotate-[50deg]" viewBox="0 0 240 270" width="353"><path d="M37.9129 265.894C90.8306 288.485 233.119 197.985 240.652 125.366C248.186 52.7476 95.1312 -20.454 58.649 5.25442C5.974 42.3845 -29.7413 237.029 37.9129 265.894Z"></path></svg>
            </div>
            <div className="mb-[24px]">
                <p className="text-[#0a0a0a] mb-[16px] font-bold text-[16px] leading-[150%]">Choose your billing cycle</p>
                <div className="flex flex-row">
                    <button onClick={() => {
								setParams({...params, priceId: "pri_01jmzdpbsxhtnja9ntsx6q2s55"})
							}}
                        className="mr-[16px] focus:bg-[#f1f7fe] text-center border-[1px] focus:border-[2px] focus:border-[#3092fa] border-grey border-solid rounded-[20px] flex flex-col justify-start p-[15px] w-full">
                        <div className="block">
                            <div className="max-w-[247px]">
                                <p className="items-center flex justify-between text-left w-full flex-wrap-reverse text-[14px]">Annual plan</p>
                                <div className="text-left">
                                    <div className="flex items-center mt-[4px] mb-[2px]">
                                        <span className="mr-[8px]">
                                            <span className="text-black font-bold text-[22px] leading-[110%]">£2.99</span>
                                            <span className="text-[#4c5966] font-bold text-[22px] leading-[110%]"> / month</span>
                                        </span>
                                        <span className="inline-flex text-[12px] h-[24px] leading-[24px] bg-[#2cc302] text-white items-center rounded-[9999px] px-[8px] ">
                                            <span>Best Value</span>
                                        </span>
                                    </div>
                                    <div className="">
                                        <span className="text-[#4c5966] text-[12px] leading-[130%]">
                                            <span>Billed £35.88 every 12 months</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => {
								setParams({...params, priceId: "pri_01jmzdrw6zjte9c94adtp3s8vx"})
							}}
                        className="mr-[16px] text-center border-[1px] border-grey border-solid rounded-[20px] flex flex-col justify-start p-[15px] w-full focus:bg-[#f1f7fe] focus:border-[#3092fa] focus:border-[2px]">
                        <div className="block">
                            <div className="max-w-[247px]">
                                <p className="items-center flex justify-between text-left w-full flex-wrap-reverse text-[14px]">Quarterly plan</p>
                                <div className="text-left">
                                    <div className="flex items-center mt-[4px] mb-[2px]">
                                        <span className="mr-[8px]">
                                            <span className="text-black font-bold text-[22px] leading-[110%]">£3.99</span>
                                            <span className="text-[#4c5966] font-bold text-[22px] leading-[110%]"> / month</span>
                                        </span>
                                    </div>
                                    <div className="">
                                        <span className="text-[#4c5966] text-[12px] leading-[130%]">
                                            <span>Billed £11.97 every 3 months</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
                <div className="flex flex-row mt-[12px]">
                    <button onClick={() => {
								setParams({...params, priceId: "pri_01jmzdxks8xzzaxjfyyd1rbpws"})
							}}
                        className="mr-[16px] focus:bg-[#f1f7fe] text-center border-[1px] focus:border-[2px] focus:border-[#3092fa] border-grey border-solid rounded-[20px] flex flex-col justify-start py-[10px] px-[15px] w-full">
                        <div className="block">
                            <div className="max-w-[247px]">
                                <p className="items-center flex justify-between text-left w-full flex-wrap-reverse text-[12px]">Monthly plan</p>
                                <div className="text-left">
                                    <div className="flex items-center mt-[2px] mb-[2px]">
                                        <span className="mr-[8px]">
                                            <span className="text-black font-bold text-[18px] leading-[110%]">£4.99</span>
                                            <span className="text-[#4c5966] font-bold text-[18px] leading-[110%]"> / month</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                    <button onClick={() => {
								setParams({...params, priceId: "pri_01jmzdz0c87pxmssa32rz2y975"})
							}}
                        className="mr-[16px] text-center border-[1px] border-grey border-solid rounded-[20px] flex flex-col justify-start py-[10px] px-[15px] w-full focus:bg-[#f1f7fe] focus:border-[#3092fa] focus:border-[2px]">
                        <div className="block">
                            <div className="max-w-[247px]">
                                <p className="items-center flex justify-between text-left w-full flex-wrap-reverse text-[12px]">Weekly plan</p>
                                <div className="text-left">
                                    <div className="flex items-center mt-[2px] mb-[2px]">
                                        <span className="mr-[8px]">
                                            <span className="text-black font-bold text-[18px] leading-[110%]">£1.75</span>
                                            <span className="text-[#4c5966] font-bold text-[18px] leading-[110%]"> / week</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
			<div className="justify-center mt-2 p-2">
                <p className="font-bold text-[16px] leading-[150%]">Choose your payment method</p>
                <div>
                    
                </div>
            </div>
            
            <div className="checkout-frame mt-2 p-2">
            </div>
          </div>
        </div>
      </div>
	  {/* Toast message below */}
	  <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          {/* Notification panel, dynamically insert this into the live region when it needs to be displayed */}
          <Transition show={show}>
            <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition data-[closed]:data-[enter]:translate-y-2 data-[enter]:transform data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-100 data-[enter]:ease-out data-[leave]:ease-in data-[closed]:data-[enter]:sm:translate-x-2 data-[closed]:data-[enter]:sm:translate-y-0">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon aria-hidden="true" className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-3 w-500 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">Order {orderInfo.id} created!</p>
                    <p className="mt-1 text-sm text-gray-500">You should receive an order confirmation email soon.</p>
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShow(false)
                      }}
                      className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <span className="sr-only">Close</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  );
}
