<?php

declare(strict_types=1);

namespace Netgen\Bundle\LayoutsUIBundle\DependencyInjection;

use Jean85\PrettyVersions;
use Symfony\Component\Config\Resource\FileResource;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;
use Symfony\Component\Yaml\Yaml;

final class NetgenLayoutsUIExtension extends Extension implements PrependExtensionInterface
{
    public function load(array $configs, ContainerBuilder $container): void
    {
    }

    public function prepend(ContainerBuilder $container): void
    {
        $container->setParameter(
            'nglayouts_app.asset.version',
            PrettyVersions::getVersion('netgen/layouts-ui')->getShortCommitHash()
        );

        $prependConfigs = [
            'framework/assets.yml' => 'framework',
        ];

        foreach ($prependConfigs as $configFile => $prependConfig) {
            $configFile = __DIR__ . '/../Resources/config/' . $configFile;
            $config = Yaml::parse((string) file_get_contents($configFile));
            $container->prependExtensionConfig($prependConfig, $config);
            $container->addResource(new FileResource($configFile));
        }
    }
}
