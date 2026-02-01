const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('symptomlogs', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      references: {
        model: 'patients',
        key: 'phone'
      }
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'questions',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'symptomlogs',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "phone_number",
        using: "BTREE",
        fields: [
          { name: "phone_number" },
        ]
      },
      {
        name: "question_id",
        using: "BTREE",
        fields: [
          { name: "question_id" },
        ]
      },
    ]
  });
};
