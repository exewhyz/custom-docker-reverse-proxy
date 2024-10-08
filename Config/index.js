import dotenv from "dotenv";

dotenv.config();
export const MANAGEMENT_API_PORT = process.env.MANAGEMENT_API_PORT || 8080;
export const REVERSE_PROXY_PORT = process.env.REVERSE_PROXY_PORT || 80;
export const DOCKER_SOCKET_PATH =
  process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";
