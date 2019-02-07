export default (sequelize, DataTypes) => {
  const User = sequelize.define("user", {
    username: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isAlphanumeric: {
          args: true,
          msg: "The username can only letters and numbers"
        },
        len: {
          args: [3, 25],
          msg: "The username has to be between 3 and 25 characters long"
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isEmail: {
          args: true,
          msg: "Invalid email"
        }
      }
    },
    password: {
      type: DataTypes.STRING
    }
  });

  return User;
};
