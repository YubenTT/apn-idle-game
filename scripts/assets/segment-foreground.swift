import CoreImage
import CoreImage.CIFilterBuiltins
import CoreVideo
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: segment-foreground.swift <input> <output.png>\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fputs("Unable to decode input image\n", stderr)
  exit(3)
}

if #available(macOS 14.0, *) {
  let request = VNGenerateForegroundInstanceMaskRequest()
  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])
  guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
    fputs("No foreground instance found\n", stderr)
    exit(4)
  }
  var bestInstance: Int? = nil
  var bestScore = -Double.infinity
  for instance in observation.allInstances {
    let candidate = try observation.generateScaledMaskForImage(
      forInstances: IndexSet(integer: instance),
      from: handler
    )
    CVPixelBufferLockBaseAddress(candidate, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(candidate, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(candidate) else { continue }
    let width = CVPixelBufferGetWidth(candidate)
    let height = CVPixelBufferGetHeight(candidate)
    let stride = CVPixelBufferGetBytesPerRow(candidate)
    let bytes = base.assumingMemoryBound(to: UInt8.self)
    var area = 0.0
    var weightedX = 0.0
    for y in 0..<height {
      for x in 0..<width {
        let value = Double(bytes[y * stride + x]) / 255.0
        area += value
        weightedX += Double(x) * value
      }
    }
    guard area > 1 else { continue }
    let centerX = weightedX / area
    let centered = max(0.15, 1.0 - abs(centerX - Double(width) * 0.5) / (Double(width) * 0.5))
    let score = area * (0.55 + centered * 0.45)
    if score > bestScore {
      bestScore = score
      bestInstance = instance
    }
  }
  guard let bestInstance else {
    fputs("No usable foreground instance found\n", stderr)
    exit(4)
  }
  let maskBuffer = try observation.generateScaledMaskForImage(
    forInstances: IndexSet(integer: bestInstance),
    from: handler
  )
  let input = CIImage(cgImage: image)
  let mask = CIImage(cvPixelBuffer: maskBuffer)
  let transparent = CIImage(color: .clear).cropped(to: input.extent)
  let blend = CIFilter.blendWithMask()
  blend.inputImage = input
  blend.backgroundImage = transparent
  blend.maskImage = mask
  guard let result = blend.outputImage,
        let cgResult = CIContext(options: [.useSoftwareRenderer: false]).createCGImage(result, from: input.extent),
        let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fputs("Unable to composite output\n", stderr)
    exit(5)
  }
  CGImageDestinationAddImage(destination, cgResult, nil)
  guard CGImageDestinationFinalize(destination) else {
    fputs("Unable to write output\n", stderr)
    exit(6)
  }
} else {
  fputs("Foreground segmentation requires macOS 14 or later\n", stderr)
  exit(7)
}
