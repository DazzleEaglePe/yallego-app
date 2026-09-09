package app.yallego.capture.domain.usecase

import app.yallego.capture.domain.repository.DeviceRepository
import javax.inject.Inject

class GetMobileOverviewUseCase @Inject constructor(
    private val repository: DeviceRepository,
) {
    suspend operator fun invoke() = repository.fetchMobileOverview()
}
