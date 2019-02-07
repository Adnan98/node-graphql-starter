import { createServer } from "http";
import path from "path";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { fileLoader, mergeTypes, mergeResolvers } from "merge-graphql-schemas";
import jwt from "jsonwebtoken";

import { refreshTokens } from "./auth";
import models from "./models";

// Replace with your own secret keys
const SECRET = "F85F3EB5ADCD52988714A8D87CAF1";
const SECRET2 = "C791D41AEE4C6F4965D3222ACF3DD";

// load all the type definitions from the /graphql folder and join them into one file
const typeDefs = mergeTypes(
  fileLoader(path.join(__dirname, "./graphql/types")),
  { all: true }
);

// load all the resolver definitions from the /graphql folder and join them into one file
const resolvers = mergeResolvers(
  fileLoader(path.join(__dirname, "./graphql/resolvers"))
);

// Create an express instance
const app = express();

// Middleware for authenticating the request using the JWT tokens in the request headers
// TODO: Move to seperate file
const addUser = async (req, res, next) => {
  const token = req.headers["x-token"];
  if (token) {
    try {
      const { user } = jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      const refreshToken = req.headers["x-refresh-token"];
      const newTokens = await refreshTokens(
        token,
        refreshToken,
        models,
        SECRET,
        SECRET2
      );
      if (newTokens.token && newTokens.refreshToken) {
        res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
        res.set("x-token", newTokens.token);
        res.set("x-refresh-token", newTokens.refreshToken);
      }
      req.user = newTokens.user;
    }
  }
  next();
};

app.use(addUser);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, connection }) => {
    if (connection) {
      return connection.context;
    }
    // Add the user object to the context
    return { user: req.user, models, SECRET, SECRET2 };
  },
  subscriptions: {
    onConnect: async ({ token, refreshToken }, webSocket) => {
      if (token && refreshToken) {
        let user = null;
        try {
          const payload = jwt.verify(token, SECRET);
          user = payload.user;
        } catch (err) {
          // Create newtokens (refresh)
          const newTokens = await refreshTokens(
            token,
            refreshToken,
            models,
            SECRET,
            SECRET2
          );

          user = newTokens.user;
        }

        if (!user) throw new Error("Invalid Auth Tokens!");
        return true;
      }

      throw new Error("Missing Auth tokens!");
    }
  }
});

server.applyMiddleware({ app, addUser });

const httpServer = createServer(app);
server.installSubscriptionHandlers(httpServer);

const force = false;
const PORT = 4000;

models.sequelize.sync({ force }).then(() => {
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${
        server.subscriptionsPath
      }`
    );
  });
});
