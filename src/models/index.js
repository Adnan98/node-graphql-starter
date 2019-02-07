import Sequelize from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  "postgres",
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    define: {
      underscored: true
    }
  }
);

const models = {
  User: sequelize.import("./user")
};

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;
