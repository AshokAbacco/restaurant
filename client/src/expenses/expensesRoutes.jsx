import { Routes, Route } from "react-router-dom";

import ExpenseLayout from "./components/ExpenseLayout";

import Dashboard from "./pages/Dashboard";
import ExpensesList from "./pages/ExpensesList";
import Categories from "./pages/Categories";
import Stores from "./pages/Stores";
import Reports from "./pages/Reports";
import AddExpense from "./pages/AddExpense";
import EditExpense from "./pages/EditExpense";
import ExpenseDetails from "./pages/ExpenseDetails";

const ExpenseRoutes = () => {
  return (
    <Routes>

      <Route element={<ExpenseLayout />}>

        <Route
          index
          element={<Dashboard />}
        />

        <Route
          path="list"
          element={<ExpensesList />}
        />

        <Route
          path="categories"
          element={<Categories />}
        />
       <Route
         path="stores"
         element={<Stores />}
       />

        <Route
          path="reports"
          element={<Reports />}
        />

        <Route
          path="add"
          element={<AddExpense />}
        />

        <Route
          path="edit/:id"
          element={<EditExpense />}
        />

        <Route
          path=":id"
          element={<ExpenseDetails />}
        />

      </Route>

    </Routes>
  );
};

export default ExpenseRoutes;