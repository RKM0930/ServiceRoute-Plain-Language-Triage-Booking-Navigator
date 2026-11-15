export const validContacts = [
  ["09171234567", "0917-123-4567"],
  ["0917-123-4567", "0917-123-4567"],
  ["0917 123 4567", "0917-123-4567"],
  ["+639171234567", "0917-123-4567"],
  ["+63 917 123 4567", "0917-123-4567"],
  ["639171234567", "0917-123-4567"],
  ["63-917-123-4567", "0917-123-4567"],
  ["  0917-123-4567  ", "0917-123-4567"],
  ["09999999999", "0999-999-9999"],
  ["person@example.com", "person@example.com"],
  [" User.Name+tag@EXAMPLE.COM ", "User.Name+tag@example.com"],
  ["o'brien@example.org", "o'brien@example.org"],
  ["josé@例子.公司", "josé@例子.公司"],
  ["x@xn--bcher-kva.de", "x@xn--bcher-kva.de"],
  ["=legitimate-local@example.com", "=legitimate-local@example.com"]
];

export const invalidContacts = [
  "", "  ", "0917123456", "091712345678", "1234567890", "1234567",
  "hello", "0917abc4567", "0000000000", "+1234567890", "0917@@1234567",
  "08171234567", "9171234567", "++639171234567", "+63+9171234567",
  "0917--123-4567", "0917-123 4567", "0917  123 4567", "(0917)1234567",
  "0917.123.4567", "0917\t123\t4567", "0917\n123\n4567", "+63 917-123-4567",
  "+63 0917 123 4567", "0917-123-4567-", "=09171234567",
  "x@y", "x@@example.com", "x..y@example.com", ".x@example.com",
  "x.@example.com", "x y@example.com", "x@example..com", "x@-example.com",
  "x@example-.com", "x@exam_ple.com", "x@example.123", "x@example.c",
  "<img>@example.com", '"quoted"@example.com', "x".repeat(65) + "@example.com"
];

export const names = [
  ["juan dela cruz", "Juan Dela Cruz"],
  ["maria santos", "Maria Santos"],
  ["john paul", "John Paul"],
  ["anne-marie", "Anne-Marie"],
  ["o'brien", "O'Brien"],
  ["o’brien", "O’Brien"],
  ["josé maría", "José María"],
  ["élise‐marie", "Élise‐Marie"],
  ["e\u0301lise", "E\u0301lise"],
  ["McDonald", "McDonald"],
  ["de la Cruz", "de la Cruz"],
  ["van der Meer", "van der Meer"],
  ["JUAN DELA CRUZ", "JUAN DELA CRUZ"],
  ["  maria \t santos  ", "Maria Santos"],
  ["", ""], ["  ", ""],
  ["=1+1", "=1+1"],
  ["a".repeat(80), "A" + "a".repeat(79)],
  ["ß".repeat(80), "ß".repeat(80)]
];
