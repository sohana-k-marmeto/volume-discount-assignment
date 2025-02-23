// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const discountApplication = input.cart.lines
    .map((line) => {
      if (line.merchandise.__typename === "ProductVariant") {
        // Check if the product has the required tag
        const productHasTag = line.merchandise.product.hasAnyTag === true;
        if (!productHasTag) return null; // Skip if product doesn't have the tag

        // Parse metafield data safely
        const metaData = line.merchandise.product.metafield?.value;
        let parsedMetaData;
        try {
          parsedMetaData = metaData ? JSON.parse(metaData) : null;
        } catch (error) {
          console.error("Error parsing metafield:", error);
          return null;
        }

        // Ensure discounts exist in metafield
        if (!parsedMetaData?.discounts) return null;

        // Find the highest applicable discount
        const applicableDiscount = parsedMetaData.discounts
          .slice()
          .sort((a, b) => b.quantity - a.quantity)
          .find((discount) => line.quantity >= discount.quantity);

        if (applicableDiscount) {
          return {
            message: applicableDiscount.message,
            targets: [
              {
                cartLine: {
                  id: line.id,
                },
              },
            ],
            value: {
              percentage: {
                value: applicableDiscount.discount,
              },
            },
          };
        }
      }
      return null;
    })
    .filter(Boolean); // Remove null values (lines without discounts)

  // Return the discount application if at least one valid discount exists
  return discountApplication.length > 0
    ? {
        discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
        discounts: discountApplication,
      }
    : EMPTY_DISCOUNT;
}
