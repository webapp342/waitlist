/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.trustwalletapp.com',
      },
      {
        protocol: 'https',
        hostname: 'tokens.pancakeswap.finance',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: '**.trustwallet.com',
      },
      {
        protocol: 'https',
        hostname: 'bblip.io',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://*.twimg.com https://recaptcha.net/recaptcha/ http://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js https://accounts.google.com/gsi/client https://apis.google.com/js/api.js https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js https://client-api.arkoselabs.com/ https://static.ads-twitter.com https://twitter.com https://www.google-analytics.com https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js https://x.com https://sdn.payments-dev.x.com/assets/loader.min.js https://sdn.payments-staging.x.com/assets/loader.min.js https://sdn.payments-prod.x.com/assets/loader.min.js https://sdn.money-dev.x.com/assets/loader.min.js https://sdn.money-staging.x.com/assets/loader.min.js https://sdn.money.x.com/assets/loader.min.js https://sdk.dv.socure.io/latest/device-risk-sdk.js https://cdn.plaid.com/link/v2/stable/link-initialize.js https://payments-dev.x.com/customer/wasm/xxp-forward-with-sdk.js https://payments-staging.x.com/customer/wasm/xxp-forward-with-sdk.js https://payments-prod.x.com/customer/wasm/xxp-forward-with-sdk.js https://money-dev.x.com/customer/wasm/xxp-forward-with-sdk.js https://money-staging.x.com/customer/wasm/xxp-forward-with-sdk.js https://money.x.com/customer/wasm/xxp-forward-with-sdk.js https://js.stripe.com https://*.js.stripe.com https://securepubads.g.doubleclick.net https://www.googletagservices.com https://*.googletagservices.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googleadservices.com https://ads.google.com https://tpc.googlesyndication.com https://*.tpc.googlesyndication.com https://www.google.com https://googleads.g.doubleclick.net https://app.intercom.io https://widget.intercom.io https://js.intercomcdn.com https://*.telegram.org https://telegram.org 'wasm-unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.twimg.com",
              "font-src 'self' https://fonts.gstatic.com https://*.twimg.com",
              "img-src 'self' data: https: blob: https://*.twimg.com https://pbs.twimg.com",
              "connect-src 'self' https://*.twitter.com https://api.twitter.com https://*.bblip.io https://*.supabase.co https://*.vercel.app https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.binance.org https://*.ethereum.org https://*.polygonscan.com https://*.arbiscan.io https://*.optimistic.etherscan.io https://*.basescan.org https://*.lineascan.build https://*.scrollscan.com https://*.ftmscan.com https://*.celoscan.io https://*.gnosisscan.io https://*.zksync.io https://*.moonscan.io https://*.cronoscan.com https://*.mantlescan.info https://*.blastscan.io https://*.metis.io https://*.aurorascan.dev https://*.explorer.harmony.one https://*.scope.klaytn.com https://*.zkevm.polygonscan.com https://*.arbiscan.io https://*.telos.net https://*.explorer.zetachain.com https://*.manta.network https://*.modescan.io https://*.kava.io https://*.fuse.io https://*.oklink.com https://*.meter.io https://*.wanchain.org https://*.bobascan.com https://*.syscoin.org https://*.roninchain.com https://*.etherscan.io https://*.sepolia.etherscan.io https://*.sepolia.scrollscan.com https://*.sepolia.lineascan.build https://*.mumbai.polygonscan.com https://*.sepolia.arbiscan.io https://*.sepolia-optimism.etherscan.io https://*.sepolia.basescan.org https://*.testnet.snowtrace.io https://*.testnet.ftmscan.com https://*.alfajores.celoscan.io https://*.blockscout.com https://*.testnet.mantlescan.info https://*.sepolia.blastscan.io wss://*.walletconnect.org wss://*.web3modal.org",
              "frame-src 'self' https://*.twitter.com https://*.x.com https://*.walletconnect.com https://*.walletconnect.org https://*.telegram.org https://oauth.telegram.org",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
        ],
      },
      {
        source: '/logo.svg',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
}

export default nextConfig
