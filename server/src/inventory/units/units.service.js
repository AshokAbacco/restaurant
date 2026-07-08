// server\src\inventory\service\units.service.js
import prisma from "../../config/prisma.js";

export const listUnits = () =>
  prisma.unit.findMany({ orderBy: { name: "asc" } });

export const getUnitById = (id) =>
  prisma.unit.findUnique({ where: { id } });

export const createUnit = ({ name, abbreviation }) =>
  prisma.unit.create({ data: { name, abbreviation } });

export const updateUnit = (id, { name, abbreviation }) =>
  prisma.unit.update({
    where: { id },
    data: { name, abbreviation },
  });

export const deleteUnit = (id) => prisma.unit.delete({ where: { id } });