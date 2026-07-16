var DataTypes = require("sequelize").DataTypes;
var _admins = require("./admins");
var _patients = require("./patients");
var _questions = require("./questions");
var _symptomlogs = require("./symptomlogs");

function initModels(sequelize) {
  var admins = _admins(sequelize, DataTypes);
  var patients = _patients(sequelize, DataTypes);
  var questions = _questions(sequelize, DataTypes);
  var symptomlogs = _symptomlogs(sequelize, DataTypes);

  symptomlogs.belongsTo(patients, { as: "telegram_id_patient", foreignKey: "telegram_id"});
  patients.hasMany(symptomlogs, { as: "symptomlogs", foreignKey: "telegram_id"});
  symptomlogs.belongsTo(questions, { as: "question", foreignKey: "question_id"});
  questions.hasMany(symptomlogs, { as: "symptomlogs", foreignKey: "question_id"});

  return {
    admins,
    patients,
    questions,
    symptomlogs,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
