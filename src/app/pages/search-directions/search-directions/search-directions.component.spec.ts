import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchDirectionsComponent } from './search-directions.component';

describe('SearchDirectionsComponent', () => {
  let component: SearchDirectionsComponent;
  let fixture: ComponentFixture<SearchDirectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SearchDirectionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchDirectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
