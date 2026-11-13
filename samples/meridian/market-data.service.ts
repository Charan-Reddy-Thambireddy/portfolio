// meridian-web/src/app/explore/market-data.service.ts
@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly http = inject(HttpClient);

  getSeries(request: SeriesRequest): Observable<SeriesResponse> {
    return this.http.post<SeriesResponse>('/api/v1/market-data/series', request).pipe(
      retry({ count: 2, delay: (_, attempt) => timer(attempt * 500) }), // transient failures only
    );
  }
}

// explore.component.ts (excerpt): only the latest selection's response is rendered.
export class ExploreComponent {
  private readonly data = inject(MarketDataService);
  private readonly announcer = inject(LiveAnnouncer);
  readonly selection = new Subject<SeriesRequest>();

  readonly vm$ = this.selection.pipe(
    debounceTime(150),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    switchMap((request) =>
      this.data.getSeries(request).pipe(
        map((response) => ({ state: 'loaded' as const, response })),
        startWith({ state: 'loading' as const }),
        catchError(() => of({ state: 'error' as const })),
      ),
    ),
    tap((vm) => {
      if (vm.state === 'loaded') {
        const n = vm.response.series.length;
        const withheld = vm.response.withheld.length;
        this.announcer.announce(`Showing ${n} markets${withheld ? `, ${withheld} not in your subscription` : ''}.`);
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
