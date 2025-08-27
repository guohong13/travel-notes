const swaggerUi = require("swagger-ui-express");
const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");
const fs = require("fs");

function createSwaggerSpec() {
  const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
      title: "Travel Notes API",
      version: "1.0.0",
      description: "API documentation for Travel Notes",
    },
    servers: [{ url: "http://localhost:3300", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };

  const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [path.join(__dirname, "router.js")],
  };

  const generatedSpecPath = path.join(__dirname, "swagger-output.json");
  let spec = null;
  if (fs.existsSync(generatedSpecPath)) {
    spec = require(generatedSpecPath);
    if (spec && spec.openapi && spec.swagger) delete spec.swagger;
    if (spec && spec.paths) {
      const remapped = {};
      for (const key of Object.keys(spec.paths)) {
        const prefixed = key.startsWith("/api") ? key : `/api${key}`;
        remapped[prefixed] = spec.paths[key];
      }
      spec.paths = remapped;
    }
  } else {
    spec = swaggerJSDoc(swaggerOptions);
  }

  return spec;
}

function setupSwagger(app) {
  const spec = createSwaggerSpec();
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
}

module.exports = { setupSwagger };
