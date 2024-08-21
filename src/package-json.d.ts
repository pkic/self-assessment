declare module "*.json" {
  const value: {
    version: string;
    [key: string]: string;
  };
  export default value;
}
