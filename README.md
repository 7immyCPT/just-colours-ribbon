# just-colours-ribbon

Storefront ribbon for justcolours.co.za. Ecwid's own ribbon is locked (409 since 2026-10-17), so state
lives in the SupplyFlag/Fulfillment attributes and this script draws the tag itself.

- `ribbon.js`   loaded by the Ecwid store; hides stale native supplier ribbons, draws ours
- `status.json` {ecwid_product_id: [state, label]}; rewritten by `bin/publish_ribbon_status.sh` on CT 109 after each sync
- Contains no prices, stock counts or customer data.

Not loaded on the live store until Byron adds the one-line script tag in Ecwid custom code.
