# Property Investment Calculator (UK)
Live here: https://kcxgu.github.io/property-investment-calculator/

### A Svelte Project 
Initiated when I was learning the foundations of software engineering, applying relevant concepts to fully functioning, responsive web development projects whilst learning Svelte in parallel.

## Overview
This calculator takes the need-for-calculation away from the user and paints a picture of what the investment will look like. 

By asking the user for certain details, we can show the user:
- The yield
- How much mortgage is required 
- The loan-to-value ratio
- The annual rental income
- Estimated annual profit
- How many years it will take to break even

## The Problem 

When buying a buy-to-let property in the UK, the requirements and costs are very different to buying your first property, for example:
- The stamp duty at a surcharge of 3% on top of the normal rate of stamp duty tax. Note: there is a tiered stamp duty system.
- If taking out a mortgage, the deposit must generally be at least 20% of the property price, often 25%, subject to individual lender's requirements.
-It's also good to consider:
    - The yield and how many years it would take to break-even
    - One-off costs before renting out the property
    - Monthly costs to keep the property in good order as a landlord

Not everyone is as attuned to the numbers and calculations involved.

## Overarching User Story
```
As a potential buy-to-let investor
So that I can assess whether a specific property is worth investing
I want to see the key metrics when I enter the details related to the property
```

## Project Management
As it's a small, self-contained project, I took the waterfall project management approach. 

**Stage 1** 
1. Create a UX/UI design of what it should look like, identifying a colour palette and any images to be used. **[Time taken: 1 hour]**.
2. Take a mobile-first approach and start building the general calculator section first (i.e. everything up to the calculation of the yield, mortgage required, LTV ratio and the annual rental income), catering for a mobile. **[Time taken: 3.5 hours, mostly to understand the Svelte reactive "$:" syntax]**.
3. Add CSS elements, catering for different sized devices. **[Time taken: 1 hour]**

**Stage 2**
1. Continue to work on the general section by adding in the tiered stamp duty system.
2. Update to include a message if the deposit is less than 25% of the house price.
3. Add thousands separator. 
4. Any other UX/UI updates.

**Stage 3**
1. Continuing in mobile-first approach, add the more specific sections (i.e. everything up to calculating the estimated annual profit and how many years it would take to break-even).
2. Add CSS elements, catering for different sized devices.

**Stage 4**
1. Add favicon
2. Ask users to test out the project and gather feedback
3. Incorporate relevant feedback

## Tests
Simple tests were carried out throughout the development to ensure the calculations are correct. 

