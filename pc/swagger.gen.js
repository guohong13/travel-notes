const swaggerAutogen = require("swagger-autogen")();
const path = require("path");

const doc = {
  openapi: "3.0.0",
  info: { title: "Travel Notes API", version: "1.0.0" },
  servers: [{ url: "http://localhost:3300" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
};

const outputFile = path.join(__dirname, "server", "swagger-output.json");
const endpointsFiles = [path.join(__dirname, "server", "router.js")];

swaggerAutogen(outputFile, endpointsFiles, doc);
