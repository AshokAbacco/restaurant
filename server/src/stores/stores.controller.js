import * as storeService from "./stores.service.js";

export const getAllStores = async (req, res) => {
  try {
    const stores = await storeService.getAllStores();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const store = await storeService.getStoreById(req.params.id);
    if (!store) return res.status(404).json({ error: "Store not found" });
    res.json(store);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Store name is required" });
    }
    const store = await storeService.createStore(req.body);
    res.status(201).json(store);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateStore = async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Store name is required" });
    }
    const updated = await storeService.updateStore(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const result = await storeService.deleteStore(req.params.id);
    if (!result) return res.status(404).json({ error: "Store not found" });
    res.json({ message: "Store removed", result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};