# Add-Ons Management System

## ✅ What's Done

### Backend (Firebase Functions)

- ✅ GET /api/addons - Get all add-ons
- ✅ POST /api/addons - Create new add-on
- ✅ PUT /api/addons - Update existing add-on
- ✅ DELETE /api/addons/:id - Delete add-on
- ✅ Mock data fallback for empty database

### Frontend (API Config)

- ✅ API_ENDPOINTS.ADDONS endpoint added
- ✅ Ready to integrate with front counter

## 🔨 What Needs to Be Done

### 1. Update Front Counter (FrontCounter.tsx)

Replace hardcoded add-ons with API-loaded add-ons:

**Current:**

```typescript
const localAddOns = [
  { name: "Pearl (Sago)", price: 15 },
  // ... hardcoded
];
```

**Should be:**

```typescript
const [addons, setAddons] = useState<any[]>([]);

// Load add-ons on mount
useEffect(() => {
  fetch(API_ENDPOINTS.ADDONS)
    .then((res) => res.json())
    .then((data) => setAddons(data.data));
}, []);
```

### 2. Add Quantity Picker for Each Add-On

Change from checkbox to quantity input with +/- buttons:

**Current:**

```typescript
selectedExtras.includes(addon.name);
```

**Should be:**

```typescript
const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(
  {}
);

// In the UI:
<TextField
  type="number"
  value={addonQuantities[addon.id] || 0}
  onChange={(e) => {
    const newQuantities = {
      ...addonQuantities,
      [addon.id]: parseInt(e.target.value) || 0,
    };
    setAddonQuantities(newQuantities);
  }}
  InputProps={{
    startAdornment: (
      <IconButton
        onClick={() =>
          setAddonQuantities({
            ...addonQuantities,
            [addon.id]: Math.max(0, (addonQuantities[addon.id] || 0) - 1),
          })
        }
      >
        <Remove />
      </IconButton>
    ),
    endAdornment: (
      <IconButton
        onClick={() =>
          setAddonQuantities({
            ...addonQuantities,
            [addon.id]: (addonQuantities[addon.id] || 0) + 1,
          })
        }
      >
        <Add />
      </IconButton>
    ),
  }}
/>;
```

### 3. Update Price Calculation

Include add-on quantities:

```typescript
const calculateUnitPrice = (base: number) => {
  // ... size price logic ...

  // Add extras pricing WITH QUANTITY
  const addOnTotal = Object.entries(addonQuantities).reduce(
    (total, [addonId, quantity]) => {
      if (quantity > 0) {
        const addon = addons.find((a) => a.id === addonId);
        return total + (addon ? addon.price * quantity : 0);
      }
      return total;
    },
    0
  );

  return sizePrice + addOnTotal;
};
```

### 4. Create Management UI

Add to Management.tsx or create AddOnsManagement.tsx:

- List all add-ons
- Add new add-on
- Edit existing add-on
- Delete add-on

## 📋 Implementation Checklist

- [ ] Load add-ons from API in FrontCounter
- [ ] Replace checkbox with quantity picker
- [ ] Update calculateUnitPrice with quantities
- [ ] Create management UI for add-ons
- [ ] Test add to order with quantities
- [ ] Test across all devices

## 🚀 Next Steps

Tell me which part you want me to implement first:

1. Update Front Counter with quantity picker
2. Create Add-Ons Management UI
3. Both
