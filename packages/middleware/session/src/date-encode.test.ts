import { test, expect } from "vitest";
import {
	base64ToDate,
	bytesToDate,
	bytesToNumber,
	dateToBase64,
	numberToBytes,
} from "./crypto";

test("encodes/decodes numbers", () => {
	expect(bytesToNumber(numberToBytes(123456789))).toBe(123456789);
	expect(bytesToNumber(numberToBytes(8640000000000000))).toBe(8640000000000000);
});

test("encodes/decodes dates", () => {
	expect(bytesToDate(numberToBytes(new Date(0).getTime()))).toEqual(
		new Date(0),
	);
	expect(
		bytesToDate(numberToBytes(new Date(8640000000000000).getTime())),
	).toEqual(new Date(8640000000000000));
});

test("encodes/decodes dates to base64", () => {
	expect(base64ToDate(dateToBase64(new Date(0)))).toEqual(new Date(0));
	expect(base64ToDate(dateToBase64(new Date(8640000000000000)))).toEqual(
		new Date(8640000000000000),
	);
});
