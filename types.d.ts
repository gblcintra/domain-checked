declare module 'react' {
  export const StrictMode: any
  export const useEffect: any
  export const useMemo: any
  export const useState: any
  const React: any
  export default React
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(node: any): void
  }
}

declare module 'dotenv/config'
declare module 'bcryptjs' {
  const bcrypt: any
  export default bcrypt
}
declare module 'cors' {
  const cors: any
  export default cors
}
declare module 'better-sqlite3' {
  const Database: any
  export default Database
}
declare module 'express' {
  const express: any
  export type NextFunction = any
  export type Request = any
  export type Response = any
  export default express
}
declare module 'jsonwebtoken' {
  const jwt: any
  export default jwt
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}


declare module 'node:dns/promises' {
  const dns: any
  export default dns
}
declare module 'node:crypto' {
  const crypto: any
  export default crypto
}
declare module 'node:path' {
  const path: any
  export default path
}
declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
declare const process: any
declare const AbortSignal: any
