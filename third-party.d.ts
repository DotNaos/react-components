declare module "isomorphic-git" {
  const git: any;
  export default git;
  export const TREE: any;
  export const walk: any;
}

declare module "isomorphic-git/http/node" {
  const http: any;
  export default http;
}
