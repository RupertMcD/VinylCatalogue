// Example records for trying out the screens while developing.
// They have fixed ids, so loading them twice doesn't create copies.

import { createRecord } from './record.js';

const samples = [
  { artist: 'Miles Davis', title: 'Kind of Blue', year: 1959, label: 'Columbia', format: 'LP', vinylGrade: 'VG+', sleeveGrade: 'VG', pricePaid: 18, dateAdded: '2026-03-02', notes: 'Bought at a record fair in Bristol. Light surface noise on side two.' },
  { artist: 'Joni Mitchell', title: 'Blue', year: 1971, label: 'Reprise', format: 'LP', vinylGrade: 'NM', sleeveGrade: 'VG+', pricePaid: 24.5, dateAdded: '2026-04-11' },
  { artist: 'Björk', title: 'Debut', year: 1993, label: 'One Little Indian', format: 'LP', vinylGrade: 'M', sleeveGrade: 'M', pricePaid: 27.99, dateAdded: '2026-05-20', notes: 'Reissue, still sealed when bought.' },
  { artist: 'Sigur Rós', title: 'Ágætis byrjun', year: 1999, label: 'Fat Cat', format: 'LP', vinylGrade: 'NM', sleeveGrade: 'NM', pricePaid: 30, dateAdded: '2026-06-01' },
  { artist: 'The Beatles', title: 'Abbey Road', year: 1969, label: 'Apple', format: 'LP', vinylGrade: 'VG', sleeveGrade: 'G+', pricePaid: 15, dateAdded: '2026-01-15', notes: 'Ring wear on the sleeve.' },
  { artist: 'Kate Bush', title: 'Hounds of Love', year: 1985, label: 'EMI', format: 'LP', vinylGrade: 'VG+', sleeveGrade: 'VG+', pricePaid: 22, dateAdded: '2026-02-08' },
  { artist: 'New Order', title: 'Blue Monday', year: 1983, label: 'Factory', format: '12"', vinylGrade: 'VG', sleeveGrade: 'VG', pricePaid: 12, dateAdded: '2026-07-19' },
  { artist: 'The Smiths', title: 'This Charming Man', year: 1983, label: 'Rough Trade', format: '7"', vinylGrade: 'G+', sleeveGrade: 'G', pricePaid: 4, dateAdded: '2026-08-03' },
  { artist: 'Radiohead', title: 'OK Computer', year: 1997, label: 'Parlophone', format: 'LP', vinylGrade: 'NM', sleeveGrade: 'VG+', pricePaid: 32, dateAdded: '2026-09-12' },
  { artist: 'Nick Drake', title: 'Fruit Tree', year: 1979, label: 'Island', format: 'Box set', vinylGrade: 'VG+', sleeveGrade: 'VG', pricePaid: 85, dateAdded: '2026-10-05', notes: 'Four records. Booklet included.' },
  { artist: 'Massive Attack', title: 'Blue Lines', year: 1991, label: 'Wild Bunch', format: 'LP', vinylGrade: 'VG+', sleeveGrade: '', pricePaid: null, dateAdded: '2026-10-22', notes: 'A present, so no price.' },
  { artist: 'Aretha Franklin', title: 'Lady Soul', year: 1968, label: 'Atlantic', format: 'LP', vinylGrade: 'F', sleeveGrade: 'P', pricePaid: 2, dateAdded: '2026-11-01', notes: 'Rough copy from a charity shop. Plays through.' },
  { artist: 'Portishead', title: 'Dummy', year: 1994, label: 'Go! Beat', format: 'LP', vinylGrade: '', sleeveGrade: '', pricePaid: 26, dateAdded: '2026-11-09' },
  { artist: 'David Bowie', title: '"Heroes"', year: 1977, label: 'RCA Victor', format: 'LP', vinylGrade: 'VG', sleeveGrade: 'VG+', pricePaid: 20, dateAdded: '2026-11-12' },
];

export function createSampleRecords() {
  return samples.map((sample, i) => createRecord({
    ...sample,
    id: `sample-${String(i + 1).padStart(2, '0')}`,
    dateAdded: new Date(`${sample.dateAdded}T12:00:00`).toISOString(),
  }));
}
