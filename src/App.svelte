<script>
	let housePrice;
	let deposit;
	let monthlyRentalIncome;
	let fees;
	let oneOffCost;
	let monthlyMortgage;
	let monthlyCosts;

	$: depositPercent = (deposit / housePrice) * 100;
	$: yieldCalc = (annualRentalIncome / housePrice) * 100;
	$: requiredMortgage = housePrice - deposit;
	$: annualRentalIncome = monthlyRentalIncome * 12;
	$: ltv = (requiredMortgage / housePrice) * 100;

	$: monthlyProfit = monthlyRentalIncome - monthlyCosts - monthlyMortgage;
	$: annualProfit = monthlyProfit * 12;
	$: breakEven = Math.round((fees + oneOffCost) / annualProfit);
</script>

<main>
	<header>
		<h1>Property Investment Calculator</h1>
		<p>Buy to Let • UK</p>
	</header>

	<div class="notes">
		<p>
			Use this calculator to quickly see what the buy-to-let investment
			opportunity will look like.
		</p>
		<p>
			More helpful information are available on the UK government's
			website: <a
				href="https://www.moneyhelper.org.uk/en/homes/buying-a-home/buy-to-let-mortgages-explained"
				>Money Helper.</a
			>
		</p>
	</div>
	<!-- Beginning Input and Output -->

	<!-- Beginning General Input and Output -->
	<h3>General Calculations</h3>
	<div class="container">
		{#if depositPercent < 25}
			<p class="warning">
				Generally, deposit should be at least 25% of property price
			</p>
		{:else}
			<p class="message">Enter required fields below to continue</p>
		{/if}
		<!-- Beginning General Input-->
		<div class="calc-input">
			<div class="section">
				<div class="section-top">
					<p class="name">House Price</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="house-price"
						placeholder="100,000"
						bind:value={housePrice}
					/>
				</div>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Deposit</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="deposit"
						bind:value={deposit}
						placeholder="20,000"
					/>
				</div>
				<p class="note">
					{depositPercent || ""} <span>%</span>
				</p>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Stamp Duty</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					{#if !housePrice}
						<input
							type="number"
							id="stamp-duty"
							value=""
							placeholder="We will calculate this"
							readonly
						/>
					{:else if housePrice <= 40000}
						<input
							type="number"
							id="stamp-duty"
							value="0"
							readonly
						/>
					{:else if housePrice > 40000 && housePrice <= 250000}
						<input
							type="number"
							id="stamp-duty"
							value={housePrice * 0.03}
							readonly
						/>
					{:else if housePrice > 250000 && housePrice <= 925000}
						<input
							type="number"
							id="stamp-duty"
							value={250000 * 0.03 + (housePrice - 250000) * 0.08}
							readonly
						/>
					{:else if housePrice > 925000 && housePrice <= 1500000}
						<input
							type="number"
							id="stamp-duty"
							value={250000 * 0.03 +
								(925000 - 250000) * 0.08 +
								(housePrice - 925000) * 0.13}
							readonly
						/>
					{:else if housePrice > 1500000}
						<input
							type="number"
							id="stamp-duty"
							value={250000 * 0.03 +
								(925000 - 250000) * 0.08 +
								(1500000 - 925000) * 0.13 +
								(housePrice - 1500000) * 0.15}
							readonly
						/>
					{/if}
				</div>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Estimated Monthly Rental Income</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="monthly-rental-income"
						bind:value={monthlyRentalIncome}
						placeholder="800"
					/>
				</div>
			</div>
		</div>
		<!--Beginning General Output-->
		<div class="calc-output">
			<div class="row">
				<div class="col left note">Stamp Duty Notes:</div>
				<div class="col right note">
					{#if !housePrice}
						<p>Remember, stamp duty is tiered</p>
					{:else if housePrice <= 40000}
						<p>
							No stamp duty required for properties below £40,000
						</p>
					{:else if housePrice > 40000 && housePrice <= 250000}
						<p>
							For properties between £40,001 and £250,000, 3% on
							full property price
						</p>
					{:else if housePrice > 250000 && housePrice <= 925000}
						<p>
							For properties between £250,001 and £925,000, 8%
							tiered
						</p>
					{:else if housePrice > 925000 && housePrice <= 1500000}
						<p>
							For properties between £925,001 and £1.5m, 13%
							tiered
						</p>
					{:else if housePrice > 1500000}
						<p>For properties above £1.5m, 15% tiered</p>
					{/if}
				</div>
			</div>
			<div class="row">
				<div class="col left">Yield:</div>
				<div class="col right">
					<span id="yield">{yieldCalc || ""}</span>%
				</div>
			</div>
			<div class="row">
				<div class="col left">Mortgage Required:</div>
				<div class="col right">
					{#if !requiredMortgage}
						<p>£</p>
					{:else}
						<p>{requiredMortgage.toLocaleString("en")}</p>
					{/if}
				</div>
			</div>
			<div class="row">
				<div class="col left">Loan-to-Value:</div>
				<div class="col right">
					<span id="yield">{ltv || ""}</span>%
				</div>
			</div>
			<div class="row">
				<div class="col left">Annual Rental Income:</div>
				<div class="col right">
					{#if !annualRentalIncome}
						<p>£</p>
					{:else}
						<p>
							£{annualRentalIncome.toLocaleString("en")}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<!-- End of General Input and Output -->
	</div>
	<!-- End of General Input and Output -->

	<!-- Beginning of Additional Input and Output-->
	<div class="container">
		<!-- Beginning Additional Input and Output -->
		<h3>Additional Calculations*</h3>
		<p id="additional-fyi">
			*Calculations exclude house price, deposit and stamp duty on the
			assumption that these will be covered in the sale revenue at the end
			of the investment period.
		</p>
		<!-- Beginning Additional Input -->
		<div class="calc-input">
			<div class="section">
				<div class="section-top">
					<p class="name">Estimated Fees</p>
					<p class="note">
						(e.g. legal fees, bank fees, surveyor's fees, etc.)
					</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="fees"
						placeholder="10,000"
						bind:value={fees}
					/>
				</div>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Estimated One-Off Costs</p>
					<p class="note">
						(e.g. refurbishment budget, letting fee, etc.)
					</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="oneOffCost"
						placeholder="1,000"
						bind:value={oneOffCost}
					/>
				</div>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Estimated Monthly Mortgage Payment</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="monthlyMortgage"
						placeholder="200"
						bind:value={monthlyMortgage}
					/>
				</div>
			</div>
			<div class="section">
				<div class="section-top">
					<p class="name">Estimated Monthly Costs</p>
					<p class="note">
						(e.g. landlord insurance, service charge (if any), etc.)
					</p>
				</div>
				<div class="section-bottom">
					<p>£</p>
					<input
						type="number"
						id="monthlyCosts"
						placeholder="50"
						bind:value={monthlyCosts}
					/>
				</div>
			</div>
		</div>
		<!-- Beginning Additional Output-->
		<div class="calc-output">
			<div class="row">
				<div class="col left">Estimated Monthly Profit:</div>
				<div class="col right">
					{#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
						<p>£{monthlyProfit.toLocaleString("en")}</p>
					{:else}
						<p class="output-warning">
							Enter monthly rental income, monthly mortgage and
							monthly costs to continue
						</p>
					{/if}
				</div>
			</div>
			<div class="row">
				<div class="col left">Estimated Annual Profit:</div>
				<div class="col right">
					{#if monthlyRentalIncome && monthlyMortgage && monthlyCosts}
						<p>£{annualProfit.toLocaleString("en")}</p>
					{:else}
						<p class="output-warning">
							Enter monthly rental income, monthly mortgage and
							monthly costs to continue
						</p>
					{/if}
				</div>
			</div>
			<div class="row">
				<div class="col left">Break-Even:</div>
				<div class="col right">
					{#if annualProfit && fees && oneOffCost}
						<p>
							Estimated at least {breakEven || 1} year(s)
						</p>
					{:else}
						<p class="output-warning">
							Enter monthly rental income and all additional
							calculation fields to continue
						</p>
					{/if}
				</div>
			</div>
		</div>
		<!-- End of Additional Input andd Output-->
	</div>
</main>

<style>
	main {
		text-align: center;
		padding: 2rem;
		margin: 0 auto;
		max-width: 800px;
	}

	h1 {
		color: #1d1d1d;
		font-size: 2.75rem;
		font-weight: 100;
	}

	h3 {
		padding: 2rem 0 0.5rem 0;
	}

	#additional-fyi {
		line-height: 130%;
		padding: 0.5rem 0;
		font-weight: 300;
	}

	header p {
		padding: 1rem 0;
	}

	.notes {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: justify;
		font-weight: 300;
		line-height: 125%;
	}

	.notes p {
		padding: 0.25rem 0;
	}

	.message {
		margin: 0.5rem auto;
		background-color: var(--blue);
		color: var(--near-white);
		border-radius: 5px;
		padding: 0.5rem 0.75rem;
		max-width: fit-content;
		line-height: 125%;
		box-shadow: 0px 0px, 5px 5px 8px #c7d7fb;
	}

	.warning {
		margin: 0.5rem auto;
		background-color: var(--soft-purple);
		color: var(--near-white);
		border-radius: 5px;
		padding: 0.5rem 1rem;
		max-width: fit-content;
		line-height: 125%;
		box-shadow: 0px 0px, 5px 5px 8px #cbd0fc;
	}

	.output-warning {
		color: var(--blue);
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	.section-top {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.section-bottom {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.section-bottom p {
		padding-left: 0.25rem;
	}

	.name {
		padding-top: 0.5rem;
	}

	.calc-input {
		padding: 1rem 0;
	}

	input {
		flex: 1 1 0%;
		border-radius: 5px;
		margin: 0.5rem auto;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		background: var(--soft-blue);
		box-shadow: inset 5px 5px 7px #ccd0d3, inset -5px -5px 7px #ffffff;
	}

	.row {
		display: flex;
	}

	.col {
		flex: 50%;
		align-items: center;
		justify-content: center;
		width: 30vw;
		padding: 0.5rem 0;
	}

	.left {
		text-align: right;
		padding-right: 1rem;
	}

	.right {
		text-align: left;
	}

	.note {
		font-size: 0.8rem;
	}

	@media (min-width: 640px) {
		h1 {
			font-size: 4rem;
		}

		.name {
			width: 17rem;
		}

		.calc-input {
			display: grid;
			grid-template-columns: auto auto;
			align-items: baseline;
			padding: 0.5rem 0;
			gap: 1rem;
		}
	}

	@media (min-width: 1024px) {
		.notes p {
			line-height: 125%;
			padding: 0.5rem 0;
		}
	}
</style>
