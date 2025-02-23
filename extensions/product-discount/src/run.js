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
        const productTag = line.merchandise.product.hasAnyTag === true;
        const metaData = line.merchandise.product.metafield.value;
        let parsedMetaData;
        
        if (metaData) {
          try {
            parsedMetaData = JSON.parse(metaData);
          } catch (error) {
            console.error("Error parsing metafield:", error);
            return null;
          }
        }

        if (productTag && parsedMetaData?.discounts) {
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
      }
      return null;
    })
    .filter((discount) => discount !== null);

  return discountApplication.length > 0
    ? {
        discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
        discounts: discountApplication,
      }
    : EMPTY_DISCOUNT;
}
