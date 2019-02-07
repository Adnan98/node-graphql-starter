import bcrypt from "bcryptjs";
import { tryLogin } from "../../auth";

export default {
  Query: {
    getUser: (parent, { id }, { models }) => {
      models.User.findOne({ where: { id } });
    },
    allUsers: (parent, args, { models }) => models.User.findAll()
  },

  Mutation: {
    login: (parent, { email, password }, { models, SECRET, SECRET2 }) => {
      return tryLogin(email, password, models, SECRET, SECRET2);
    },

    register: async (parent, { password, ...args }, { models }) => {
      const hashedPassword = await bcrypt.hashSync(
        password,
        bcrypt.genSaltSync(12)
      );

      try {
        const user = await models.User.create({
          ...args,
          password: hashedPassword
        }); // createsthe user in the database

        return {
          ok: true,
          user
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatErrors(err, models)
        };
      }
    }
  }
};
