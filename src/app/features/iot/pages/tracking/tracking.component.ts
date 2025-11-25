import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Telemetry } from '../../models/telemetry.model';
import { TelemetryService } from '../../services/telemetry.service';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.css']
})
export class TrackingComponent implements OnInit {
  telemetry: Telemetry | undefined;

  constructor(
    private route: ActivatedRoute,
    private telemetryService: TelemetryService
  ) {}

  ngOnInit(): void {
    const vehicleId = Number(this.route.snapshot.paramMap.get('id'));
    if (vehicleId) {
      this.telemetryService.getTelemetryByVehicleId(vehicleId).subscribe(dataArray => {
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          this.telemetry = dataArray[0];
        } else {
          this.telemetry = undefined;
        }
      });
    }
  }
}
